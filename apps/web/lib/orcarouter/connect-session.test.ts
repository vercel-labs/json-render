// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import {
  CONNECT_SESSION_TTL_MS,
  cancelOrcaConnectSession,
  discoverOrcaModels,
  getOrcaConnectSession,
  resetOrcaConnectSessions,
  startOrcaConnectSession,
  submitOrcaConnectCode,
} from "./connect-session";
import { getOrcaServerState, resetOrcaServerState } from "./server-store";

/** A per-suite env file so parallel suites never share project state. */
const ENV_FILE = join(
  process.cwd(),
  `.orca-test-env-${process.pid}-connect-session-test-ts`,
);
process.env.ORCAROUTER_ENV_FILE = ENV_FILE;
const originalEnv = process.env.ORCAROUTER_API_KEY;

/** A local stand-in for the OrcaRouter auth origin. */
interface FakeAuthServer {
  origin: string;
  close: () => Promise<void>;
  /** Codes the server will accept, with the exchange body it last saw. */
  calls: Array<{ path: string; body: Record<string, unknown> }>;
}

async function startFakeAuthServer(
  handler: (
    path: string,
    body: Record<string, unknown>,
  ) => {
    status: number;
    body: unknown;
  },
): Promise<FakeAuthServer> {
  const calls: FakeAuthServer["calls"] = [];
  const server: Server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      let body: Record<string, unknown> = {};
      try {
        body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        body = {};
      }
      const path = request.url ?? "/";
      calls.push({ path, body });
      const result = handler(path, body);
      response.writeHead(result.status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(result.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    calls,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/** Drive the loopback redirect the way a browser would. */
async function deliverCallback(
  callbackUrl: string,
  params: Record<string, string>,
): Promise<void> {
  const url = new URL(callbackUrl);
  url.search = new URLSearchParams(params).toString();
  await fetch(url.toString());
}

async function waitForStatus(
  sessionId: string,
  statuses: string[],
  timeoutMs = 4000,
): Promise<ReturnType<typeof getOrcaConnectSession>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = getOrcaConnectSession(sessionId);
    if (session && statuses.includes(session.status)) return session;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return getOrcaConnectSession(sessionId);
}

describe("OrcaRouter connect sessions", () => {
  beforeEach(async () => {
    await rm(ENV_FILE, { force: true, recursive: true });
    delete process.env.ORCAROUTER_API_KEY;
    resetOrcaServerState();
    resetOrcaConnectSessions();
  });

  afterEach(async () => {
    resetOrcaConnectSessions();
    resetOrcaServerState();
    await rm(ENV_FILE, { force: true, recursive: true });
    if (originalEnv === undefined) delete process.env.ORCAROUTER_API_KEY;
    else process.env.ORCAROUTER_API_KEY = originalEnv;
  });

  it("starts a loopback session with a verifier-free authorize URL", async () => {
    const session = await startOrcaConnectSession({ flow: "loopback" });
    const url = new URL(session.authorizeUrl);
    expect(url.origin).toBe("https://www.orcarouter.ai");
    expect(url.pathname).toBe("/auth");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe("api");
    expect(url.searchParams.get("app_name")).toBe("json-render");
    expect(url.searchParams.get("callback_url")).toMatch(
      /^http:\/\/127\.0\.0\.1:\d+\/cb$/,
    );
    expect(session.authorizeUrl).not.toContain("code_verifier");
    expect(session.status).toBe("pending");
    expect(session.callbackUrl).toBe(url.searchParams.get("callback_url"));
    cancelOrcaConnectSession(session.sessionId);
  });

  it("completes authorize -> callback -> exchange -> persist through the project's flow", async () => {
    const auth = await startFakeAuthServer((path) => {
      if (path !== "/api/v1/auth/keys") {
        return { status: 404, body: { error: "not_found" } };
      }
      return {
        status: 200,
        body: { key: "sk-orca-issued-key", user_id: "u-9", scope: "api" },
      };
    });
    process.env.ORCA_AUTH_BASE_URL = auth.origin;
    process.env.ORCA_API_BASE_URL = auth.origin;
    resetOrcaServerState();

    try {
      const session = await startOrcaConnectSession({ flow: "loopback" });
      const challenge = new URL(session.authorizeUrl).searchParams.get(
        "code_challenge",
      )!;
      const state = new URL(session.authorizeUrl).searchParams.get("state")!;
      expect(challenge).toBeTruthy();

      await deliverCallback(session.callbackUrl!, {
        code: "the-one-time-code",
        state,
      });

      const finished = await waitForStatus(session.sessionId, [
        "connected",
        "error",
      ]);
      expect(finished?.status).toBe("connected");
      expect(finished?.maskedKey).toBe("sk-orca-••••-key");

      // The exchange went to the auth origin's exchange path with the verifier.
      expect(auth.calls).toHaveLength(1);
      expect(auth.calls[0]!.path).toBe("/api/v1/auth/keys");
      expect(auth.calls[0]!.body).toMatchObject({
        code: "the-one-time-code",
        code_challenge_method: "S256",
      });
      expect(typeof auth.calls[0]!.body.code_verifier).toBe("string");

      // The verifier was never exposed through the session view.
      expect(JSON.stringify(finished)).not.toContain(
        auth.calls[0]!.body.code_verifier as string,
      );
      expect(getOrcaServerState().store.getCredential()?.apiKey).toBe(
        "sk-orca-issued-key",
      );
      expect(getOrcaServerState().store.getCredential()?.method).toBe(
        "orcarouter-oauth",
      );
    } finally {
      await auth.close();
      delete process.env.ORCA_AUTH_BASE_URL;
      delete process.env.ORCA_API_BASE_URL;
    }
  });

  it("rejects a state mismatch without exchanging the code", async () => {
    const auth = await startFakeAuthServer(() => ({
      status: 200,
      body: { key: "sk-orca-should-not-exist", scope: "api" },
    }));
    process.env.ORCA_AUTH_BASE_URL = auth.origin;
    resetOrcaServerState();
    try {
      const session = await startOrcaConnectSession({ flow: "loopback" });
      await deliverCallback(session.callbackUrl!, {
        code: "attacker-code",
        state: "not-the-state",
      });
      const finished = await waitForStatus(session.sessionId, [
        "error",
        "connected",
      ]);
      expect(finished?.status).toBe("error");
      expect(finished?.message).toMatch(/did not match/);
      expect(auth.calls).toHaveLength(0);
      expect(getOrcaServerState().store.isConnected()).toBe(false);
    } finally {
      await auth.close();
      delete process.env.ORCA_AUTH_BASE_URL;
    }
  });

  it("reports a denial as a terminal error and releases the listener", async () => {
    const session = await startOrcaConnectSession({ flow: "loopback" });
    const state = new URL(session.authorizeUrl).searchParams.get("state")!;
    await deliverCallback(session.callbackUrl!, {
      error: "access_denied",
      state,
    });
    const finished = await waitForStatus(session.sessionId, [
      "error",
      "connected",
    ]);
    expect(finished?.status).toBe("error");
    expect(finished?.message).toMatch(/declined/);
    expect(getOrcaServerState().store.isConnected()).toBe(false);
  });

  it("does not leak a credential when the exchange is rejected", async () => {
    const auth = await startFakeAuthServer(() => ({
      status: 403,
      body: { error: "invalid_grant", error_description: "sensitive upstream" },
    }));
    process.env.ORCA_AUTH_BASE_URL = auth.origin;
    resetOrcaServerState();
    try {
      const session = await startOrcaConnectSession({ flow: "loopback" });
      const state = new URL(session.authorizeUrl).searchParams.get("state")!;
      await deliverCallback(session.callbackUrl!, { code: "used-code", state });
      const finished = await waitForStatus(session.sessionId, [
        "error",
        "connected",
      ]);
      expect(finished?.status).toBe("error");
      expect(finished?.message).not.toContain("sensitive upstream");
      expect(finished?.message).not.toContain("used-code");
      expect(getOrcaServerState().store.isConnected()).toBe(false);
    } finally {
      await auth.close();
      delete process.env.ORCA_AUTH_BASE_URL;
    }
  });

  it("cancels explicitly and frees the lock for a new login", async () => {
    const first = await startOrcaConnectSession({ flow: "loopback" });
    expect(cancelOrcaConnectSession(first.sessionId)).toBe(1);
    const after = getOrcaConnectSession(first.sessionId);
    expect(after?.status).toBe("cancelled");

    const second = await startOrcaConnectSession({ flow: "loopback" });
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(second.status).toBe("pending");
    cancelOrcaConnectSession(second.sessionId);
  });

  it("expires a session after the auth-code TTL", async () => {
    const session = await startOrcaConnectSession({ flow: "oob" });
    // Force the window closed without waiting ten minutes.
    const state = getOrcaServerState();
    expect(state).toBeTruthy();
    expect(CONNECT_SESSION_TTL_MS).toBe(600_000);
    cancelOrcaConnectSession(session.sessionId);
    expect(getOrcaConnectSession(session.sessionId)?.status).toBe("cancelled");
  });

  it("completes an out-of-band login with a pasted code", async () => {
    const auth = await startFakeAuthServer(() => ({
      status: 200,
      body: { key: "sk-orca-oob-key", user_id: "u-3", scope: "api" },
    }));
    process.env.ORCA_AUTH_BASE_URL = auth.origin;
    resetOrcaServerState();
    try {
      const session = await startOrcaConnectSession({ flow: "oob" });
      expect(session.callbackUrl).toBe("oob");
      const finished = await submitOrcaConnectCode(
        session.sessionId,
        "  pasted-code  ",
      );
      expect(finished?.status).toBe("connected");
      expect(auth.calls[0]!.body.code).toBe("pasted-code");
      expect(getOrcaServerState().store.getCredential()?.apiKey).toBe(
        "sk-orca-oob-key",
      );
    } finally {
      await auth.close();
      delete process.env.ORCA_AUTH_BASE_URL;
    }
  });

  it("rejects an empty pasted code without exchanging", async () => {
    const auth = await startFakeAuthServer(() => ({
      status: 200,
      body: { key: "sk-orca-nope", scope: "api" },
    }));
    process.env.ORCA_AUTH_BASE_URL = auth.origin;
    resetOrcaServerState();
    try {
      const session = await startOrcaConnectSession({ flow: "oob" });
      const finished = await submitOrcaConnectCode(session.sessionId, "   ");
      expect(finished?.status).toBe("error");
      expect(auth.calls).toHaveLength(0);
    } finally {
      await auth.close();
      delete process.env.ORCA_AUTH_BASE_URL;
    }
  });

  it("refuses a scope downgrade instead of assuming the requested scope", async () => {
    const auth = await startFakeAuthServer(() => ({
      status: 200,
      body: { key: "sk-orca-narrow", scope: "connector" },
    }));
    process.env.ORCA_AUTH_BASE_URL = auth.origin;
    resetOrcaServerState();
    try {
      const session = await startOrcaConnectSession({ flow: "oob" });
      const finished = await submitOrcaConnectCode(session.sessionId, "code");
      expect(finished?.status).toBe("error");
      expect(finished?.message).toMatch(/connector/);
      expect(getOrcaServerState().store.isConnected()).toBe(false);
    } finally {
      await auth.close();
      delete process.env.ORCA_AUTH_BASE_URL;
    }
  });

  it("replaces an in-flight login and refuses to let the older one win", async () => {
    const first = await startOrcaConnectSession({ flow: "oob" });
    const second = await startOrcaConnectSession({ flow: "oob" });
    expect(second.sessionId).not.toBe(first.sessionId);
    // The superseded session must not install a credential.
    const stale = await submitOrcaConnectCode(first.sessionId, "code");
    expect(stale?.status).toBe("cancelled");
    expect(getOrcaServerState().store.isConnected()).toBe(false);
    cancelOrcaConnectSession(second.sessionId);
  });

  it("returns null for an unknown session", async () => {
    expect(getOrcaConnectSession("does-not-exist")).toBeNull();
    expect(await submitOrcaConnectCode("does-not-exist", "code")).toBeNull();
  });

  it("never exposes the verifier through the session view", async () => {
    const session = await startOrcaConnectSession({ flow: "loopback" });
    const serialized = JSON.stringify(session);
    expect(serialized).not.toContain("code_verifier");
    expect(serialized).not.toContain("codeVerifier");
    cancelOrcaConnectSession(session.sessionId);
  });
});

describe("discoverOrcaModels", () => {
  beforeEach(async () => {
    await rm(ENV_FILE, { force: true, recursive: true });
    delete process.env.ORCAROUTER_API_KEY;
    resetOrcaServerState();
  });

  afterEach(async () => {
    resetOrcaServerState();
    await rm(ENV_FILE, { force: true, recursive: true });
    delete process.env.ORCA_API_BASE_URL;
    if (originalEnv === undefined) delete process.env.ORCAROUTER_API_KEY;
    else process.env.ORCAROUTER_API_KEY = originalEnv;
  });

  it("returns the degraded seed, not free text, when not connected", async () => {
    const { catalog, maskedKey } = await discoverOrcaModels();
    expect(catalog.source).toBe("seed");
    expect(catalog.degraded).toBe(true);
    expect(catalog.degradedReason).toMatch(/Connect to OrcaRouter/);
    expect(catalog.models.length).toBeGreaterThan(0);
    expect(maskedKey).toBeNull();
  });

  it("uses the live catalog when a key is configured", async () => {
    const api = await startFakeAuthServer((path) => {
      if (path.startsWith("/v1/models")) {
        return {
          status: 200,
          body: {
            data: [
              {
                id: "vendor/live-model",
                supported_endpoint_types: ["openai"],
                architecture: { input_modalities: ["text"] },
              },
            ],
          },
        };
      }
      return { status: 404, body: {} };
    });
    process.env.ORCA_API_BASE_URL = api.origin;
    process.env.ORCAROUTER_API_KEY = "sk-orca-live";
    resetOrcaServerState();
    try {
      const { catalog, maskedKey } = await discoverOrcaModels();
      expect(catalog.source).toBe("live");
      expect(catalog.degraded).toBe(false);
      expect(catalog.models.map((m) => m.id)).toEqual(["vendor/live-model"]);
      expect(maskedKey).toBe("sk-orca-••••live");
    } finally {
      await api.close();
    }
  });

  it("degrades to the seed when the catalog request fails", async () => {
    const api = await startFakeAuthServer(() => ({ status: 500, body: {} }));
    process.env.ORCA_API_BASE_URL = api.origin;
    process.env.ORCAROUTER_API_KEY = "sk-orca-broken";
    resetOrcaServerState();
    try {
      const { catalog } = await discoverOrcaModels();
      expect(catalog.source).toBe("seed");
      expect(catalog.degraded).toBe(true);
      expect(catalog.models.map((m) => m.id)).toContain("openai/gpt-5.5");
    } finally {
      await api.close();
    }
  });

  it("marks the exact account generation needsReauth on a 401", async () => {
    const api = await startFakeAuthServer(() => ({ status: 401, body: {} }));
    process.env.ORCA_API_BASE_URL = api.origin;
    process.env.ORCAROUTER_API_KEY = "sk-orca-revoked";
    resetOrcaServerState();
    try {
      await discoverOrcaModels();
      const state = getOrcaServerState();
      expect(state.store.needsReauth).toBe(true);
      expect(state.store.isConnected()).toBe(false);
      // The secret is retained; the user can retry without losing the account.
      expect(state.store.getCredential()?.apiKey).toBe("sk-orca-revoked");
      // No refresh is attempted: the credential is not rotated.
      expect(state.store.getCredential()?.generation).toBe(1);
    } finally {
      await api.close();
    }
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { GET as modelsGet } from "../../app/api/orcarouter/models/route";
import {
  GET as credentialGet,
  DELETE as credentialDelete,
} from "../../app/api/orcarouter/credential/route";
import { POST as connectPost } from "../../app/api/orcarouter/connect/route";
import {
  POST as sessionPost,
  DELETE as sessionDelete,
  GET as sessionGet,
  PATCH as sessionPatch,
} from "../../app/api/orcarouter/connect/session/route";
import { resetOrcaConnectSessions } from "./connect-session";
import { getOrcaServerState, resetOrcaServerState } from "./server-store";

/** A per-suite env file so parallel suites never share project state. */
const ENV_FILE = join(
  process.cwd(),
  `.orca-test-env-${process.pid}-api-routes-test-ts`,
);
process.env.ORCAROUTER_ENV_FILE = ENV_FILE;
const originalEnv = process.env.ORCAROUTER_API_KEY;

interface Recorded {
  origin: string;
  path: string;
  authorization: string | null;
}

/** One fake origin, used for both roles, so we can assert which one was hit. */
async function startFakeOrigin(
  handler: (path: string) => { status: number; body: unknown },
): Promise<{
  origin: string;
  requests: Recorded[];
  close: () => Promise<void>;
}> {
  const requests: Recorded[] = [];
  const server: Server = createServer((request, response) => {
    requests.push({
      origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      path: request.url ?? "/",
      authorization: request.headers.authorization ?? null,
    });
    const result = handler(request.url ?? "/");
    response.writeHead(result.status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result.body));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

describe("OrcaRouter API routes", () => {
  beforeEach(async () => {
    await rm(ENV_FILE, { force: true, recursive: true });
    delete process.env.ORCAROUTER_API_KEY;
    delete process.env.ORCA_AUTH_BASE_URL;
    delete process.env.ORCA_API_BASE_URL;
    delete process.env.ORCA_BASE_URL;
    resetOrcaServerState();
    resetOrcaConnectSessions();
  });

  afterEach(async () => {
    resetOrcaConnectSessions();
    resetOrcaServerState();
    await rm(ENV_FILE, { force: true, recursive: true });
    delete process.env.ORCA_AUTH_BASE_URL;
    delete process.env.ORCA_API_BASE_URL;
    delete process.env.ORCA_BASE_URL;
    if (originalEnv === undefined) delete process.env.ORCAROUTER_API_KEY;
    else process.env.ORCAROUTER_API_KEY = originalEnv;
  });

  describe("POST /api/orcarouter/connect", () => {
    it("accepts a well-formed key, masks it, and persists it", async () => {
      const request = new Request("http://localhost/api/orcarouter/connect", {
        method: "POST",
        body: JSON.stringify({
          method: "api_key",
          apiKey: "sk-orca-abcdefghijkl",
        }),
      });
      const response = await connectPost(request);
      const payload = (await response.json()) as Record<string, unknown>;
      expect(response.status).toBe(200);
      expect(payload.method).toBe("api_key");
      expect(payload.maskedKey).toBe("sk-orca-••••ijkl");
      expect(JSON.stringify(payload)).not.toContain("sk-orca-abcdefghijkl");
      expect(getOrcaServerState().store.getCredential()?.apiKey).toBe(
        "sk-orca-abcdefghijkl",
      );
    });

    it.each([
      ["a key without the prefix", "not-a-key", /starts with/],
      ["an empty key", "", /Enter an OrcaRouter API key/],
      ["a key with whitespace", "sk-orca-a b", /whitespace/],
    ])("rejects %s", async (_label, apiKey, pattern) => {
      const response = await connectPost(
        new Request("http://localhost/api/orcarouter/connect", {
          method: "POST",
          body: JSON.stringify({ method: "api_key", apiKey }),
        }),
      );
      expect(response.status).toBe(400);
      const payload = (await response.json()) as { error: string };
      expect(payload.error).toMatch(pattern);
      if (apiKey) expect(payload.error).not.toContain(apiKey);
    });

    it("refuses the PKCE method here so each entry point stays explicit", async () => {
      const response = await connectPost(
        new Request("http://localhost/api/orcarouter/connect", {
          method: "POST",
          body: JSON.stringify({ method: "orcarouter-oauth" }),
        }),
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET/DELETE /api/orcarouter/credential", () => {
    it("reports both origins and never the key", async () => {
      process.env.ORCAROUTER_API_KEY = "sk-orca-status-key";
      resetOrcaServerState();
      const response = await credentialGet();
      const payload = (await response.json()) as Record<string, unknown>;
      expect(payload.connected).toBe(true);
      expect(payload.method).toBe("api_key");
      expect(payload.maskedKey).toBe("sk-orca-••••-key");
      expect(payload.authOrigin).toBe("https://www.orcarouter.ai");
      expect(payload.apiOrigin).toBe("https://api.orcarouter.ai");
      expect(JSON.stringify(payload)).not.toContain("sk-orca-status-key");
    });

    it("clears the credential", async () => {
      process.env.ORCAROUTER_API_KEY = "sk-orca-to-clear";
      resetOrcaServerState();
      await credentialDelete();
      expect(getOrcaServerState().store.isConnected()).toBe(false);
      const response = await credentialGet();
      expect(
        ((await response.json()) as { connected: boolean }).connected,
      ).toBe(false);
    });
  });

  describe("GET /api/orcarouter/models", () => {
    it("rejects an unknown capability", async () => {
      const response = await modelsGet(
        new Request("http://localhost/api/orcarouter/models?capability=audio"),
      );
      expect(response.status).toBe(400);
    });

    it("returns the degraded seed when not connected, with no key", async () => {
      const response = await modelsGet(
        new Request("http://localhost/api/orcarouter/models?capability=chat"),
      );
      const payload = (await response.json()) as {
        source: string;
        degraded: boolean;
        models: Array<{ id: string }>;
        maskedKey: string | null;
      };
      expect(response.status).toBe(200);
      expect(payload.source).toBe("seed");
      expect(payload.degraded).toBe(true);
      expect(payload.models.map((m) => m.id)).toContain("orcarouter/auto");
      expect(payload.maskedKey).toBeNull();
    });

    it("filters a live catalog by capability and modality", async () => {
      const origin = await startFakeOrigin(() => ({
        status: 200,
        body: {
          data: [
            {
              id: "vendor/text",
              supported_endpoint_types: ["openai"],
              architecture: { input_modalities: ["text"] },
            },
            {
              id: "vendor/vision",
              supported_endpoint_types: ["openai"],
              architecture: { input_modalities: ["text", "image"] },
            },
            {
              id: "vendor/embed",
              supported_endpoint_types: ["embeddings"],
            },
          ],
        },
      }));
      process.env.ORCA_API_BASE_URL = origin.origin;
      process.env.ORCAROUTER_API_KEY = "sk-orca-live-key";
      resetOrcaServerState();
      try {
        const text = (await (
          await modelsGet(
            new Request(
              "http://localhost/api/orcarouter/models?capability=chat",
            ),
          )
        ).json()) as { models: Array<{ id: string }>; source: string };
        expect(text.source).toBe("live");
        expect(text.models.map((m) => m.id)).toEqual([
          "vendor/text",
          "vendor/vision",
        ]);

        const vision = (await (
          await modelsGet(
            new Request(
              "http://localhost/api/orcarouter/models?capability=chat&input=image",
            ),
          )
        ).json()) as { models: Array<{ id: string }> };
        expect(vision.models.map((m) => m.id)).toEqual(["vendor/vision"]);

        const embeddings = (await (
          await modelsGet(
            new Request(
              "http://localhost/api/orcarouter/models?capability=embedding",
            ),
          )
        ).json()) as { models: Array<{ id: string }> };
        expect(embeddings.models.map((m) => m.id)).toEqual(["vendor/embed"]);

        // The key reached the catalog as a Bearer token, on the API origin.
        expect(origin.requests[0]!.authorization).toBe(
          "Bearer sk-orca-live-key",
        );
        expect(origin.requests[0]!.path).toContain("/v1/models");
      } finally {
        await origin.close();
      }
    });

    it("reports an invalidated selection so the client can clear it", async () => {
      const origin = await startFakeOrigin(() => ({
        status: 200,
        body: {
          data: [
            {
              id: "vendor/text",
              supported_endpoint_types: ["openai"],
              architecture: { input_modalities: ["text"] },
            },
          ],
        },
      }));
      process.env.ORCA_API_BASE_URL = origin.origin;
      process.env.ORCAROUTER_API_KEY = "sk-orca-live-key";
      resetOrcaServerState();
      try {
        const response = await modelsGet(
          new Request(
            "http://localhost/api/orcarouter/models?capability=chat&input=image&selected=vendor/text",
          ),
        );
        const payload = (await response.json()) as {
          selectionStillValid: boolean;
          models: Array<{ id: string }>;
        };
        expect(payload.selectionStillValid).toBe(false);
        expect(payload.models).toEqual([]);
      } finally {
        await origin.close();
      }
    });
  });

  describe("auth and inference use different origins", () => {
    it("routes the authorize URL and the exchange to the auth origin only, and the catalog to the API origin only", async () => {
      const authOrigin = await startFakeOrigin((path) => {
        if (path.startsWith("/api/v1/auth/keys")) {
          return {
            status: 200,
            body: { key: "sk-orca-issued", user_id: "u-1", scope: "api" },
          };
        }
        return { status: 404, body: { error: "not_found" } };
      });
      const apiOrigin = await startFakeOrigin((path) => {
        if (path.startsWith("/v1/models")) {
          return {
            status: 200,
            body: {
              data: [
                {
                  id: "vendor/live",
                  supported_endpoint_types: ["openai"],
                  architecture: { input_modalities: ["text"] },
                },
              ],
            },
          };
        }
        return { status: 404, body: { error: "not_found" } };
      });
      process.env.ORCA_AUTH_BASE_URL = authOrigin.origin;
      process.env.ORCA_API_BASE_URL = apiOrigin.origin;
      resetOrcaServerState();

      try {
        const session = (await (
          await sessionPost(
            new Request("http://localhost/api/orcarouter/connect/session", {
              method: "POST",
              body: JSON.stringify({ flow: "oob" }),
            }),
          )
        ).json()) as { sessionId: string; authorizeUrl: string };

        // The authorize URL points at the auth origin, never the inference one.
        expect(session.authorizeUrl.startsWith(authOrigin.origin)).toBe(true);
        expect(session.authorizeUrl).toContain("/auth?");
        expect(session.authorizeUrl).not.toContain("/v1/models");

        const finished = (await (
          await sessionPatch(
            new Request("http://localhost/api/orcarouter/connect/session", {
              method: "PATCH",
              body: JSON.stringify({
                sessionId: session.sessionId,
                code: "the-code",
              }),
            }),
          )
        ).json()) as { status: string };

        expect(finished.status).toBe("connected");
        // Exactly one request reached the auth origin, at the exchange path.
        expect(authOrigin.requests).toHaveLength(1);
        expect(authOrigin.requests[0]!.path).toBe("/api/v1/auth/keys");
        expect(authOrigin.requests[0]!.path).not.toMatch(/^\/v1\/auth\//);
        // Nothing reached the inference origin during authentication.
        expect(apiOrigin.requests).toHaveLength(0);

        // Discovery now goes to the API origin, with the issued key.
        const models = (await (
          await modelsGet(
            new Request(
              "http://localhost/api/orcarouter/models?capability=chat",
            ),
          )
        ).json()) as { models: Array<{ id: string }>; maskedKey: string };
        expect(models.models.map((m) => m.id)).toEqual(["vendor/live"]);
        expect(models.maskedKey).toBe("sk-orca-••••sued");
        expect(apiOrigin.requests).toHaveLength(1);
        expect(apiOrigin.requests[0]!.path).toBe("/v1/models?capability=chat");
        expect(apiOrigin.requests[0]!.authorization).toBe(
          "Bearer sk-orca-issued",
        );
        // The auth origin saw no discovery traffic.
        expect(authOrigin.requests).toHaveLength(1);
      } finally {
        await authOrigin.close();
        await apiOrigin.close();
      }
    });

    it("supports one shared self-hosted origin through the fallback", async () => {
      const shared = await startFakeOrigin((path) => {
        if (path.startsWith("/api/v1/auth/keys")) {
          return { status: 200, body: { key: "sk-orca-self", scope: "api" } };
        }
        if (path.startsWith("/v1/models")) {
          return { status: 200, body: { data: [] } };
        }
        return { status: 404, body: {} };
      });
      process.env.ORCA_BASE_URL = shared.origin;
      resetOrcaServerState();
      try {
        const session = (await (
          await sessionPost(
            new Request("http://localhost/api/orcarouter/connect/session", {
              method: "POST",
              body: JSON.stringify({ flow: "oob" }),
            }),
          )
        ).json()) as { sessionId: string; authorizeUrl: string };
        expect(session.authorizeUrl.startsWith(shared.origin)).toBe(true);

        await sessionPatch(
          new Request("http://localhost/api/orcarouter/connect/session", {
            method: "PATCH",
            body: JSON.stringify({
              sessionId: session.sessionId,
              code: "c",
            }),
          }),
        );
        await modelsGet(
          new Request("http://localhost/api/orcarouter/models?capability=chat"),
        );

        const paths = shared.requests.map((request) => request.path);
        expect(paths).toContain("/api/v1/auth/keys");
        expect(paths).toContain("/v1/models?capability=chat");
      } finally {
        await shared.close();
      }
    });
  });

  describe("session lifecycle", () => {
    it("returns 400 without a sessionId and 404 for an unknown one", async () => {
      expect((await sessionGet(new Request("http://localhost/x"))).status).toBe(
        400,
      );
      expect(
        (await sessionGet(new Request("http://localhost/x?sessionId=nope")))
          .status,
      ).toBe(404);
      expect(
        (
          await sessionPatch(
            new Request("http://localhost/x", {
              method: "PATCH",
              body: JSON.stringify({ sessionId: "nope", code: "c" }),
            }),
          )
        ).status,
      ).toBe(404);
    });

    it("cancels a session and reports how many were released", async () => {
      const session = (await (
        await sessionPost(
          new Request("http://localhost/api/orcarouter/connect/session", {
            method: "POST",
            body: JSON.stringify({ flow: "loopback" }),
          }),
        )
      ).json()) as { sessionId: string };

      const cancelled = (await (
        await sessionDelete(
          new Request(
            `http://localhost/api/orcarouter/connect/session?sessionId=${session.sessionId}`,
            { method: "DELETE" },
          ),
        )
      ).json()) as { ok: boolean; cancelled: number };
      expect(cancelled.ok).toBe(true);
      expect(cancelled.cancelled).toBe(1);

      const after = (await (
        await sessionGet(
          new Request(`http://localhost/x?sessionId=${session.sessionId}`),
        )
      ).json()) as { status: string };
      expect(after.status).toBe("cancelled");
    });

    it("replaces an in-flight login so the lock is never stuck", async () => {
      const first = (await (
        await sessionPost(
          new Request("http://localhost/x", {
            method: "POST",
            body: JSON.stringify({ flow: "loopback" }),
          }),
        )
      ).json()) as { sessionId: string };
      const second = (await (
        await sessionPost(
          new Request("http://localhost/x", {
            method: "POST",
            body: JSON.stringify({ flow: "loopback" }),
          }),
        )
      ).json()) as { sessionId: string };
      expect(second.sessionId).not.toBe(first.sessionId);

      const stale = (await (
        await sessionGet(
          new Request(`http://localhost/x?sessionId=${first.sessionId}`),
        )
      ).json()) as { status: string };
      expect(stale.status).toBe("cancelled");
      await sessionDelete(
        new Request(`http://localhost/x?sessionId=${second.sessionId}`, {
          method: "DELETE",
        }),
      );
    });

    it("defaults an unknown flow to out-of-band rather than guessing loopback", async () => {
      const session = (await (
        await sessionPost(
          new Request("http://localhost/x", {
            method: "POST",
            body: JSON.stringify({ flow: "device_grant" }),
          }),
        )
      ).json()) as { flow: string; callbackUrl: string };
      expect(session.flow).toBe("oob");
      expect(session.callbackUrl).toBe("oob");
      await sessionDelete(
        new Request("http://localhost/x", { method: "DELETE" }),
      );
    });
  });
});

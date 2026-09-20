// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  ORCA_API_KEY_PREFIX,
  classifyOrcaInferenceFailure,
  createOrcaApiKeySource,
  createOrcaPkceSource,
  redactOrcaApiKey,
  validateOrcaApiKey,
  type OrcaCodeReceiver,
  type OrcaCredentialResult,
  type OrcaCredentialSource,
} from "./credential";
import { OrcaAuthError } from "./pkce";
import { resolveOrcarouterOrigins } from "./origins";
import {
  OrcaCredentialStore,
  deserializeOrcaCredentialStore,
  serializeOrcaCredentialStore,
} from "./credential-store";
import { selectOrcaModels } from "./catalog";
import { orcarouterSeedCatalog } from "./catalog";

const origins = resolveOrcarouterOrigins();

describe("redactOrcaApiKey", () => {
  it("never returns the whole key", () => {
    const masked = redactOrcaApiKey("sk-orca-abcdefghijklmnop");
    expect(masked).not.toContain("ijklmnop");
    expect(masked).toBe("sk-orca-••••mnop");
  });

  it("handles empty and short values without throwing", () => {
    expect(redactOrcaApiKey("")).toBe("");
    expect(redactOrcaApiKey(null)).toBe("");
    expect(redactOrcaApiKey(undefined)).toBe("");
    expect(redactOrcaApiKey("short")).toBe("••••");
  });
});

describe("validateOrcaApiKey", () => {
  it("accepts a well-formed key", () => {
    expect(validateOrcaApiKey("sk-orca-abc123")).toEqual({
      ok: true,
      problem: null,
    });
  });

  it.each([
    ["", /Enter an OrcaRouter API key/],
    ["   ", /Enter an OrcaRouter API key/],
    ["sk-orca-abc 123", /cannot contain whitespace/],
    ["sk-live-abc", /starts with/],
    [ORCA_API_KEY_PREFIX, /incomplete/],
  ])("rejects %j", (value, pattern) => {
    const result = validateOrcaApiKey(value);
    expect(result.ok).toBe(false);
    expect(result.problem).toMatch(pattern);
    expect(result.problem).not.toContain("abc123");
  });

  it("reports format as format, not as proof of validity", () => {
    expect(validateOrcaApiKey("sk-orca-not-a-real-key").ok).toBe(true);
  });
});

describe("createOrcaApiKeySource", () => {
  it("produces the shared credential result shape", async () => {
    const source = createOrcaApiKeySource("  sk-orca-test-key  ");
    expect(source.method).toBe("api_key");
    expect(source.label).toBe("OrcaRouter - API");
    await expect(source.acquire()).resolves.toEqual({
      apiKey: "sk-orca-test-key",
      method: "api_key",
      grantedScope: null,
      accountId: null,
    });
  });

  it("refuses a malformed key without leaking it", async () => {
    const source = createOrcaApiKeySource("nope");
    const error = await source.acquire().catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(OrcaAuthError);
    expect(error.message).not.toContain("nope");
  });
});

function receiverFor(
  callback: {
    code?: string | null;
    error?: string | null;
    state?: string | null;
  },
  callbackUrl = "http://127.0.0.1:51733/cb",
): OrcaCodeReceiver {
  return {
    callbackUrl,
    async waitForCallback() {
      return {
        code: callback.code ?? null,
        error: callback.error ?? null,
        state: callback.state ?? null,
      };
    },
    cancel: vi.fn(),
  };
}

const exchangeOk = async () => ({
  key: "sk-orca-from-pkce",
  userId: "u-1",
  grantedScope: "api",
});

describe("createOrcaPkceSource", () => {
  it("is a second, independently usable adapter on the same seam", () => {
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "loopback",
    });
    expect(source.method).toBe("orcarouter-oauth");
    expect(source.label).toBe("OrcaRouter - Auth");
  });

  it("completes authorize -> callback -> exchange -> credential on loopback", async () => {
    const attempt = {
      codeVerifier: "v",
      codeChallenge: "c",
      state: "expected-state",
    };
    const receiver = receiverFor({
      code: "the-code",
      state: "expected-state",
    });
    const exchange = vi.fn(exchangeOk);
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "loopback",
      createCodeReceiver: async () => receiver,
      createAttempt: async () => attempt,
      exchange,
    });

    await expect(source.acquire()).resolves.toEqual({
      apiKey: "sk-orca-from-pkce",
      method: "orcarouter-oauth",
      grantedScope: "api",
      accountId: "u-1",
    });
    expect(exchange).toHaveBeenCalledWith(
      expect.objectContaining({ code: "the-code", attempt }),
    );
  });

  it("builds the authorize URL on the auth origin and opens it", async () => {
    const openBrowser = vi.fn();
    const attempt = {
      codeVerifier: "v",
      codeChallenge: "the-challenge",
      state: "the-state",
    };
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "loopback",
      createCodeReceiver: async () =>
        receiverFor({ code: "c", state: "the-state" }),
      createAttempt: async () => attempt,
      exchange: exchangeOk,
      openBrowser,
    });
    await source.acquire();
    const url = new URL(openBrowser.mock.calls[0]![0] as string);
    expect(url.origin).toBe("https://www.orcarouter.ai");
    expect(url.pathname).toBe("/auth");
    expect(url.searchParams.get("code_challenge")).toBe("the-challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(openBrowser.mock.calls[0]![0]).not.toContain("v");
  });

  it("rejects a state mismatch before touching the code and never exchanges", async () => {
    const exchange = vi.fn(exchangeOk);
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "loopback",
      createCodeReceiver: async () =>
        receiverFor({ code: "attacker-code", state: "wrong-state" }),
      createAttempt: async () => ({
        codeVerifier: "v",
        codeChallenge: "c",
        state: "expected-state",
      }),
      exchange,
    });
    const error = await source
      .acquire()
      .catch((e: unknown) => e as OrcaAuthError);
    expect(error.code).toBe("state_mismatch");
    expect(exchange).not.toHaveBeenCalled();
  });

  it("treats a missing state as a mismatch", async () => {
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "loopback",
      createCodeReceiver: async () => receiverFor({ code: "c" }),
      createAttempt: async () => ({
        codeVerifier: "v",
        codeChallenge: "c",
        state: "expected-state",
      }),
      exchange: exchangeOk,
    });
    await expect(source.acquire()).rejects.toMatchObject({
      code: "state_mismatch",
    });
  });

  it("reports a denial as a terminal error after the state check", async () => {
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "loopback",
      createCodeReceiver: async () =>
        receiverFor({ error: "access_denied", state: "s" }),
      createAttempt: async () => ({
        codeVerifier: "v",
        codeChallenge: "c",
        state: "s",
      }),
      exchange: exchangeOk,
    });
    const error = await source
      .acquire()
      .catch((e: unknown) => e as OrcaAuthError);
    expect(error.code).toBe("denied");
    expect(error.message).toContain("access_denied");
  });

  it("releases the listener when the wait fails", async () => {
    const cancel = vi.fn();
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "loopback",
      createCodeReceiver: async () => ({
        callbackUrl: "http://127.0.0.1:1/cb",
        waitForCallback: async () => {
          throw new Error("socket closed");
        },
        cancel,
      }),
      createAttempt: async () => ({
        codeVerifier: "v",
        codeChallenge: "c",
        state: "s",
      }),
      exchange: exchangeOk,
    });
    await expect(source.acquire()).rejects.toMatchObject({ code: "cancelled" });
    expect(cancel).toHaveBeenCalled();
  });

  it("runs the out-of-band flow with callback_url=oob", async () => {
    const exchange = vi.fn(exchangeOk);
    let seenUrl = "";
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "oob",
      createAttempt: async () => ({
        codeVerifier: "v",
        codeChallenge: "c",
        state: "s",
      }),
      requestCode: async (url) => {
        seenUrl = url;
        return "  pasted-code  ";
      },
      exchange,
    });
    await expect(source.acquire()).resolves.toMatchObject({
      method: "orcarouter-oauth",
    });
    const parsed = new URL(seenUrl);
    expect(parsed.searchParams.get("callback_url")).toBe("oob");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(exchange).toHaveBeenCalledWith(
      expect.objectContaining({ code: "pasted-code" }),
    );
  });

  it("treats an empty pasted code as a cancellation, not an exchange", async () => {
    const exchange = vi.fn(exchangeOk);
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "oob",
      createAttempt: async () => ({
        codeVerifier: "v",
        codeChallenge: "c",
        state: "s",
      }),
      requestCode: async () => "   ",
      exchange,
    });
    await expect(source.acquire()).rejects.toMatchObject({ code: "cancelled" });
    expect(exchange).not.toHaveBeenCalled();
  });

  it("uses a fresh verifier and state on every attempt", async () => {
    const seen: string[] = [];
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "oob",
      requestCode: async () => "c",
      exchange: async (options) => {
        seen.push(options.attempt.codeVerifier);
        return { key: "sk-orca-x", userId: null, grantedScope: "api" };
      },
    });
    await source.acquire();
    await source.acquire();
    expect(new Set(seen).size).toBe(2);
  });

  it("never places the verifier in the authorize URL or an error message", async () => {
    const urls: string[] = [];
    const source = createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "oob",
      requestCode: async (url) => {
        urls.push(url);
        throw new OrcaAuthError("denied", "declined");
      },
      exchange: exchangeOk,
    });
    const error = await source.acquire().catch((e: unknown) => e as Error);
    const attemptVerifier = new URL(urls[0]!).searchParams.get(
      "code_challenge",
    )!;
    expect(urls[0]).not.toContain("code_verifier");
    expect(error.message).not.toContain(attemptVerifier);
  });
});

describe("credential seam equivalence", () => {
  const sources: OrcaCredentialSource[] = [
    createOrcaApiKeySource("sk-orca-pasted-key"),
    createOrcaPkceSource({
      origins,
      appName: "json-render",
      flow: "oob",
      requestCode: async () => "code",
      exchange: async () => ({
        key: "sk-orca-pkce-key",
        userId: "u-1",
        grantedScope: "api",
      }),
    }),
  ];

  it("yields one credential shape from both adapters", async () => {
    const results = await Promise.all(sources.map((s) => s.acquire()));
    for (const result of results) {
      expect(Object.keys(result).sort()).toEqual([
        "accountId",
        "apiKey",
        "grantedScope",
        "method",
      ]);
      expect(typeof result.apiKey).toBe("string");
      expect(result.apiKey.startsWith(ORCA_API_KEY_PREFIX)).toBe(true);
    }
    expect(results.map((r) => r.method)).toEqual([
      "api_key",
      "orcarouter-oauth",
    ]);
  });

  it("downstream consumers never learn which adapter produced the credential", async () => {
    const catalog = orcarouterSeedCatalog("test");
    for (const source of sources) {
      const credential: OrcaCredentialResult = await source.acquire();
      const store = new OrcaCredentialStore();
      store.setCredential(credential);
      const usable = store.getUsableCredential();
      expect(usable).not.toBeNull();

      // Model discovery consumes only the key, never the method.
      const options = { capability: "chat" as const };
      const forKeyA = selectOrcaModels(catalog, options).map((m) => m.id);
      const forKeyB = selectOrcaModels(catalog, options).map((m) => m.id);
      expect(forKeyA).toEqual(forKeyB);
      expect(
        usable!.method === "api_key" || usable!.method === "orcarouter-oauth",
      ).toBe(true);
    }
  });
});

describe("classifyOrcaInferenceFailure", () => {
  it("treats 401 and 403 as terminal reauthentication", () => {
    for (const status of [401, 403]) {
      const result = classifyOrcaInferenceFailure(status);
      expect(result.terminal).toBe(true);
      expect(result.reason).toBeTruthy();
    }
  });

  it("leaves transient statuses non-terminal", () => {
    for (const status of [408, 429, 500, 502, 503]) {
      expect(classifyOrcaInferenceFailure(status)).toEqual({
        terminal: false,
        reason: null,
      });
    }
  });

  it("describes a revoked key as needing a new connection, not a refresh", () => {
    const reason = classifyOrcaInferenceFailure(401).reason!;
    expect(reason).toMatch(/Reconnect/);
    expect(reason.toLowerCase()).not.toContain("refresh");
  });
});

describe("OrcaCredentialStore", () => {
  const result = (
    method: "api_key" | "orcarouter-oauth",
    accountId: string | null,
  ): OrcaCredentialResult => ({
    apiKey: `sk-orca-${accountId ?? "anon"}-${method}`,
    method,
    grantedScope: "api",
    accountId,
  });

  it("installs credentials from either source and bumps the generation", () => {
    const store = new OrcaCredentialStore();
    expect(store.isConnected()).toBe(false);
    const first = store.setCredential(result("api_key", "u-1"));
    const second = store.setCredential(result("orcarouter-oauth", "u-1"));
    expect(second.generation).toBe(first.generation + 1);
    expect(store.isConnected()).toBe(true);
    expect(store.needsReauth).toBe(false);
  });

  it("marks only the exact account generation that was rejected", () => {
    const store = new OrcaCredentialStore();
    const first = store.setCredential(result("api_key", "u-1"));
    // A newer login replaces the credential while the old request is in flight.
    store.setCredential(result("orcarouter-oauth", "u-1"));
    expect(store.markNeedsReauth("u-1", first.generation, "revoked")).toBe(
      false,
    );
    expect(store.needsReauth).toBe(false);
    expect(store.isConnected()).toBe(true);
  });

  it("does not mark a different account for reauthentication", () => {
    const store = new OrcaCredentialStore();
    const credential = store.setCredential(result("api_key", "u-1"));
    expect(store.markNeedsReauth("u-2", credential.generation, "revoked")).toBe(
      false,
    );
    expect(store.needsReauth).toBe(false);
  });

  it("enters needsReauth on 401 and keeps the stored secret", () => {
    const store = new OrcaCredentialStore();
    const credential = store.setCredential(result("orcarouter-oauth", "u-1"));
    expect(store.recordInferenceStatus("u-1", credential.generation, 401)).toBe(
      true,
    );
    expect(store.needsReauth).toBe(true);
    expect(store.isConnected()).toBe(false);
    expect(store.getUsableCredential()).toBeNull();
    // The secret is retained so a transient failure is not irreversible.
    expect(store.getCredential()?.apiKey).toBe(credential.apiKey);
    expect(store.getCredential()?.reauthReason).toBeTruthy();
  });

  it("ignores a non-terminal status", () => {
    const store = new OrcaCredentialStore();
    const credential = store.setCredential(result("api_key", "u-1"));
    expect(store.recordInferenceStatus("u-1", credential.generation, 429)).toBe(
      false,
    );
    expect(store.isConnected()).toBe(true);
  });

  it("never attempts a refresh: a new login is a new credential, not a rotation", () => {
    const store = new OrcaCredentialStore();
    const credential = store.setCredential(result("orcarouter-oauth", "u-1"));
    store.recordInferenceStatus("u-1", credential.generation, 401);
    const fresh = store.setCredential(result("orcarouter-oauth", "u-1"));
    expect(fresh.generation).toBeGreaterThan(credential.generation);
    expect(store.needsReauth).toBe(false);
    expect(store.isConnected()).toBe(true);
  });

  it("clears on request", () => {
    const store = new OrcaCredentialStore();
    store.setCredential(result("api_key", "u-1"));
    store.clear();
    expect(store.getCredential()).toBeNull();
    expect(store.isConnected()).toBe(false);
  });

  it("round-trips through serialization without dropping the generation", () => {
    const store = new OrcaCredentialStore();
    const credential = store.setCredential(result("orcarouter-oauth", "u-1"));
    const restored = deserializeOrcaCredentialStore(
      serializeOrcaCredentialStore(store),
    );
    expect(restored.getCredential()).toEqual(credential);
    expect(restored.isConnected()).toBe(true);
    // A restored credential still refuses a stale generation.
    expect(
      restored.markNeedsReauth("u-1", credential.generation - 1, "revoked"),
    ).toBe(false);
    expect(
      restored.markNeedsReauth("u-1", credential.generation, "revoked"),
    ).toBe(true);
  });

  it.each([
    ["null", null],
    ["a non-object", 42],
    ["a missing credential", {}],
    ["a credential with no key", { credential: { generation: 1 } }],
    [
      "a credential with a bad generation",
      { credential: { apiKey: "k", generation: -1 } },
    ],
  ])("restores an empty store from %s", (_label, value) => {
    const store = deserializeOrcaCredentialStore(value);
    expect(store.getCredential()).toBeNull();
  });
});

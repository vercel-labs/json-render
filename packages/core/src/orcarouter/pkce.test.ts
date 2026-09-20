// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  OrcaAuthError,
  base64UrlEncode,
  buildOrcaAuthorizeUrl,
  constantTimeEqual,
  createOrcaPkceAttempt,
  exchangeOrcaAuthCode,
} from "./pkce";
import { resolveOrcarouterOrigins } from "./origins";

const origins = resolveOrcarouterOrigins();
const originsFor = (base: string) =>
  resolveOrcarouterOrigins({ authBaseUrl: base, apiBaseUrl: base });

describe("base64UrlEncode", () => {
  it("produces unpadded base64url", () => {
    const encoded = base64UrlEncode(new Uint8Array([251, 255, 191, 0, 1]));
    expect(encoded).not.toMatch(/[+/=]/);
    expect(encoded).toBe("-_-_AAE");
  });

  it("handles every input length without padding", () => {
    for (let length = 0; length <= 8; length += 1) {
      const encoded = base64UrlEncode(new Uint8Array(length).fill(255));
      expect(encoded).not.toContain("=");
    }
  });
});

describe("createOrcaPkceAttempt", () => {
  it("derives an S256 challenge from the verifier", async () => {
    const attempt = await createOrcaPkceAttempt();
    const expected = base64UrlEncode(
      new Uint8Array(
        await globalThis.crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(attempt.codeVerifier),
        ),
      ),
    );
    expect(attempt.codeChallenge).toBe(expected);
    expect(attempt.codeChallenge).not.toBe(attempt.codeVerifier);
    expect(attempt.codeChallenge).toHaveLength(43);
    expect(attempt.codeChallenge).not.toContain("=");
    expect(attempt.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(attempt.state.length).toBeGreaterThanOrEqual(20);
  });

  it("uses a fresh verifier and state for every attempt", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 16 }, () => createOrcaPkceAttempt()),
    );
    expect(new Set(attempts.map((a) => a.codeVerifier)).size).toBe(16);
    expect(new Set(attempts.map((a) => a.state)).size).toBe(16);
    expect(new Set(attempts.map((a) => a.codeChallenge)).size).toBe(16);
  });

  it("does not derive the verifier from anything guessable", async () => {
    const attempt = await createOrcaPkceAttempt();
    expect(attempt.codeVerifier).not.toContain(
      String(new Date().getFullYear()),
    );
    // 32 random bytes encoded is exactly 43 base64url characters.
    expect(attempt.codeVerifier).toHaveLength(43);
  });
});

describe("constantTimeEqual", () => {
  it("compares equal and unequal values", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
    expect(constantTimeEqual("", "")).toBe(true);
  });
});

describe("buildOrcaAuthorizeUrl", () => {
  const attempt = {
    codeVerifier: "verifier-value",
    codeChallenge: "challenge-value",
    state: "state-value",
  };

  it("targets /auth on the auth origin with S256 and no plain fallback", () => {
    const url = new URL(
      buildOrcaAuthorizeUrl({
        origins,
        callbackUrl: "http://127.0.0.1:51733/cb",
        attempt,
        appName: "json-render",
      }),
    );
    expect(url.origin).toBe("https://www.orcarouter.ai");
    expect(url.pathname).toBe("/auth");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("scope")).toBe("api");
    expect(url.searchParams.get("app_name")).toBe("json-render");
  });

  it("never puts the verifier in the URL", () => {
    const url = buildOrcaAuthorizeUrl({
      origins,
      callbackUrl: "oob",
      attempt,
      appName: "json-render",
    });
    expect(url).not.toContain(attempt.codeVerifier);
    expect(url).not.toContain("code_verifier");
    expect(new URL(url).searchParams.get("callback_url")).toBe("oob");
  });

  it("sends S256 even on the loopback flow, because the user may pick a shown code", () => {
    const url = new URL(
      buildOrcaAuthorizeUrl({
        origins,
        callbackUrl: "https://tool.example/cb",
        attempt,
        appName: "json-render",
      }),
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("passes optional hints through and omits absent ones", () => {
    const url = new URL(
      buildOrcaAuthorizeUrl({
        origins,
        callbackUrl: "oob",
        attempt,
        appName: "json-render",
        loginHint: "user@example.test",
        workspaceHint: "ws-1",
        prompt: "consent",
        scope: "api",
      }),
    );
    expect(url.searchParams.get("login_hint")).toBe("user@example.test");
    expect(url.searchParams.get("workspace_hint")).toBe("ws-1");
    expect(url.searchParams.get("prompt")).toBe("consent");

    const bare = new URL(
      buildOrcaAuthorizeUrl({
        origins,
        callbackUrl: "oob",
        attempt,
        appName: "json-render",
      }),
    );
    expect(bare.searchParams.has("login_hint")).toBe(false);
    expect(bare.searchParams.has("prompt")).toBe(false);
  });

  it("rejects a callback URL the consent endpoint would reject", () => {
    expect(() =>
      buildOrcaAuthorizeUrl({
        origins,
        callbackUrl: "http://tool.example/cb",
        attempt,
        appName: "json-render",
      }),
    ).toThrow(/only allowed for localhost/);
  });
});

describe("exchangeOrcaAuthCode", () => {
  const attempt = {
    codeVerifier: "the-verifier",
    codeChallenge: "the-challenge",
    state: "the-state",
  };

  it("posts the code, verifier and method to the auth origin's exchange path", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ key: "sk-orca-test-key", user_id: "42", scope: "api" }),
    );
    const result = await exchangeOrcaAuthCode({
      origins,
      code: "the-code",
      attempt,
      fetch,
    });

    expect(result).toEqual({
      key: "sk-orca-test-key",
      userId: "42",
      grantedScope: "api",
    });

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://www.orcarouter.ai/api/v1/auth/keys");
    expect(url).not.toContain("api.orcarouter.ai");
    expect(url).not.toMatch(/^https:\/\/[^/]+\/v1\/auth/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({
      code: "the-code",
      code_verifier: "the-verifier",
      code_challenge_method: "S256",
    });
  });

  it("reports a 403 as a terminal exchange failure without echoing the body", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json(
        { error: "invalid_grant", error_description: "sensitive detail" },
        { status: 403 },
      ),
    );
    const error = await exchangeOrcaAuthCode({
      origins,
      code: "used-code",
      attempt,
      fetch,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OrcaAuthError);
    expect((error as OrcaAuthError).code).toBe("exchange_failed");
    expect((error as OrcaAuthError).status).toBe(403);
    expect((error as Error).message).toContain("invalid_grant");
    expect((error as Error).message).not.toContain("sensitive detail");
    expect((error as Error).message).not.toContain("used-code");
    expect((error as Error).message).not.toContain("the-verifier");
  });

  it("reports 400, 429 and other statuses distinctly", async () => {
    const at = (status: number) =>
      exchangeOrcaAuthCode({
        origins,
        code: "c",
        attempt,
        fetch: async () => new Response("", { status }),
      }).catch((e: unknown) => e as OrcaAuthError);

    await expect(at(400)).resolves.toMatchObject({
      code: "exchange_failed",
      status: 400,
    });
    await expect(at(429)).resolves.toMatchObject({
      code: "exchange_failed",
      status: 429,
    });
    const other = await at(500);
    expect(other.message).toContain("status 500");
  });

  it("treats a granted scope narrower than the client needs as unusable", async () => {
    const error = await exchangeOrcaAuthCode({
      origins,
      code: "c",
      attempt,
      fetch: async () =>
        Response.json({ key: "sk-orca-x", scope: "read-only" }),
    }).catch((e: unknown) => e as OrcaAuthError);
    expect(error.code).toBe("insufficient_scope");
    expect(error.message).toContain("read-only");
  });

  it("accepts a response with no scope field, and an empty accepted set is honoured", async () => {
    const result = await exchangeOrcaAuthCode({
      origins,
      code: "c",
      attempt,
      fetch: async () => Response.json({ key: "sk-orca-x" }),
    });
    expect(result.grantedScope).toBeNull();
    expect(result.userId).toBeNull();

    const strict = await exchangeOrcaAuthCode({
      origins,
      code: "c",
      attempt,
      acceptedScopes: [],
      fetch: async () => Response.json({ key: "sk-orca-x", scope: "api" }),
    }).catch((e: unknown) => e as OrcaAuthError);
    expect(strict.code).toBe("insufficient_scope");
  });

  it.each([
    ["a missing key", { user_id: "1", scope: "api" }],
    ["an empty key", { key: "   " }],
    ["a non-string key", { key: 123 }],
  ])("rejects a malformed success response: %s", async (_label, body) => {
    const error = await exchangeOrcaAuthCode({
      origins,
      code: "c",
      attempt,
      fetch: async () => Response.json(body),
    }).catch((e: unknown) => e as OrcaAuthError);
    expect(error.code).toBe("invalid_response");
  });

  it("surfaces a transport failure as a network error, not a hang", async () => {
    const error = await exchangeOrcaAuthCode({
      origins,
      code: "c",
      attempt,
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    }).catch((e: unknown) => e as OrcaAuthError);
    expect(error.code).toBe("network");
  });

  it("reports cancellation when the caller aborts", async () => {
    const controller = new AbortController();
    const error = await exchangeOrcaAuthCode({
      origins,
      code: "c",
      attempt,
      signal: controller.signal,
      fetch: async () => {
        controller.abort();
        throw new DOMException("aborted", "AbortError");
      },
    }).catch((e: unknown) => e as OrcaAuthError);
    expect(error.code).toBe("cancelled");
  });

  it("rejects an empty code before making a request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const error = await exchangeOrcaAuthCode({
      origins,
      code: "   ",
      attempt,
      fetch,
    }).catch((e: unknown) => e as OrcaAuthError);
    expect(error.code).toBe("invalid_response");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("follows an explicit self-hosted auth origin", async () => {
    const selfHosted = originsFor("https://orca.internal.example");
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ key: "sk-orca-x", scope: "api" }),
    );
    await exchangeOrcaAuthCode({
      origins: selfHosted,
      code: "c",
      attempt,
      fetch,
    });
    expect(fetch.mock.calls[0]![0]).toBe(
      "https://orca.internal.example/api/v1/auth/keys",
    );
  });
});

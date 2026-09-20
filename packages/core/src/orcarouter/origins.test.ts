// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORCAROUTER_API_BASE_URL,
  DEFAULT_ORCAROUTER_AUTH_BASE_URL,
  isLoopbackHostname,
  orcarouterAuthorizeUrl,
  orcarouterChatCompletionsUrl,
  orcarouterExchangeUrl,
  orcarouterModelsUrl,
  resolveOrcarouterOrigins,
  validateCallbackUrl,
} from "./origins";

describe("resolveOrcarouterOrigins", () => {
  it("defaults auth to www and inference to api, and never derives one from the other", () => {
    const origins = resolveOrcarouterOrigins();
    expect(origins.authBaseUrl).toBe(DEFAULT_ORCAROUTER_AUTH_BASE_URL);
    expect(origins.apiBaseUrl).toBe(DEFAULT_ORCAROUTER_API_BASE_URL);
    expect(orcarouterAuthorizeUrl(origins)).toBe(
      "https://www.orcarouter.ai/auth",
    );
    expect(orcarouterExchangeUrl(origins)).toBe(
      "https://www.orcarouter.ai/api/v1/auth/keys",
    );
    expect(orcarouterModelsUrl(origins)).toBe(
      "https://api.orcarouter.ai/v1/models",
    );
    expect(orcarouterChatCompletionsUrl(origins)).toBe(
      "https://api.orcarouter.ai/v1/chat/completions",
    );
  });

  it("never produces the inference origin carrying an auth path", () => {
    const origins = resolveOrcarouterOrigins();
    expect(orcarouterExchangeUrl(origins)).not.toContain("api.orcarouter.ai");
    expect(orcarouterExchangeUrl(origins)).not.toBe(
      "https://api.orcarouter.ai/v1/auth/keys",
    );
    expect(orcarouterModelsUrl(origins)).not.toContain("www.orcarouter.ai");
  });

  it("uses a shared self-hosted base for both roles", () => {
    const origins = resolveOrcarouterOrigins({
      baseUrl: "https://orca.internal.example",
    });
    expect(origins.authBaseUrl).toBe("https://orca.internal.example");
    expect(origins.apiBaseUrl).toBe("https://orca.internal.example");
  });

  it("lets explicit per-role overrides win over the shared base", () => {
    const origins = resolveOrcarouterOrigins({
      baseUrl: "https://shared.example",
      authBaseUrl: "https://auth.example",
      apiBaseUrl: "https://relay.example",
    });
    expect(origins.authBaseUrl).toBe("https://auth.example");
    expect(origins.apiBaseUrl).toBe("https://relay.example");
    expect(orcarouterExchangeUrl(origins)).toBe(
      "https://auth.example/api/v1/auth/keys",
    );
    expect(orcarouterModelsUrl(origins)).toBe(
      "https://relay.example/v1/models",
    );
  });

  it("rejects plain http for a non-loopback origin", () => {
    expect(() =>
      resolveOrcarouterOrigins({ baseUrl: "http://orca.example" }),
    ).toThrow(/https unless it points at loopback/);
    expect(() =>
      resolveOrcarouterOrigins({ apiBaseUrl: "http://10.0.0.4:8080" }),
    ).toThrow(/https unless it points at loopback/);
  });

  it("permits plain http on loopback for local development", () => {
    const origins = resolveOrcarouterOrigins({
      baseUrl: "http://127.0.0.1:8080",
    });
    expect(origins.authBaseUrl).toBe("http://127.0.0.1:8080");
    expect(origins.apiBaseUrl).toBe("http://127.0.0.1:8080");
  });

  it.each([
    ["not-a-url", /not a valid absolute URL/],
    ["ftp://orca.example", /must use http or https/],
    ["https://user:pass@orca.example", /must not contain userinfo/],
    ["https://orca.example?a=1", /must not contain a query or fragment/],
    ["https://orca.example#frag", /must not contain a query or fragment/],
  ])("rejects %s", (value, pattern) => {
    expect(() => resolveOrcarouterOrigins({ baseUrl: value })).toThrow(pattern);
  });

  it("falls back to the defaults when an override is empty or whitespace", () => {
    for (const value of ["", "   "]) {
      const origins = resolveOrcarouterOrigins({ baseUrl: value });
      expect(origins.authBaseUrl).toBe(DEFAULT_ORCAROUTER_AUTH_BASE_URL);
      expect(origins.apiBaseUrl).toBe(DEFAULT_ORCAROUTER_API_BASE_URL);
    }
  });

  it("strips a trailing slash so paths never double up", () => {
    const origins = resolveOrcarouterOrigins({
      baseUrl: "https://orca.example/",
    });
    expect(orcarouterModelsUrl(origins)).toBe("https://orca.example/v1/models");
  });
});

describe("isLoopbackHostname", () => {
  it.each(["localhost", "127.0.0.1", "::1", "[::1]", "LOCALHOST"])(
    "accepts %s",
    (host) => {
      expect(isLoopbackHostname(host)).toBe(true);
    },
  );

  it.each(["orca.example", "127.0.0.1.evil.example", "0.0.0.0"])(
    "rejects %s",
    (host) => {
      expect(isLoopbackHostname(host)).toBe(false);
    },
  );
});

describe("validateCallbackUrl", () => {
  it("accepts the literal oob marker", () => {
    expect(validateCallbackUrl("oob")).toBe("oob");
  });

  it("accepts http on loopback and https on any host", () => {
    expect(validateCallbackUrl("http://127.0.0.1:51733/cb")).toContain(
      "127.0.0.1:51733",
    );
    expect(validateCallbackUrl("http://localhost:1234/cb")).toContain(
      "localhost:1234",
    );
    expect(validateCallbackUrl("https://tool.example/cb")).toContain(
      "https://tool.example",
    );
  });

  it.each([
    ["http://tool.example/cb", /only allowed for localhost/],
    ["https://user:pass@tool.example/cb", /must not contain userinfo/],
    ["https://tool.example/cb#frag", /must not contain a fragment/],
    ["/cb", /not a valid absolute URL/],
    ["ftp://tool.example/cb", /must use https/],
  ])("rejects %s", (value, pattern) => {
    expect(() => validateCallbackUrl(value)).toThrow(pattern);
  });
});

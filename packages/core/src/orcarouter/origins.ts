/**
 * OrcaRouter origin resolution.
 *
 * Authentication and inference live on two different public origins. They must
 * never be derived from one another by swapping a hostname or appending `/v1`:
 * `https://api.orcarouter.ai/v1/auth/keys` is a 404.
 */

export const DEFAULT_ORCAROUTER_AUTH_BASE_URL = "https://www.orcarouter.ai";
export const DEFAULT_ORCAROUTER_API_BASE_URL = "https://api.orcarouter.ai";

/** Consent screen. Opened in a browser; not an API. */
export const ORCAROUTER_AUTHORIZE_PATH = "/auth";
/** Auth-code exchange. On the auth origin, not under `/v1`. */
export const ORCAROUTER_EXCHANGE_PATH = "/api/v1/auth/keys";
export const ORCAROUTER_DEVICE_CODE_PATH = "/api/v1/auth/device/code";
export const ORCAROUTER_DEVICE_TOKEN_PATH = "/api/v1/auth/device/token";
/** Model catalog, on the inference origin. */
export const ORCAROUTER_MODELS_PATH = "/v1/models";
export const ORCAROUTER_CHAT_COMPLETIONS_PATH = "/v1/chat/completions";

export const ORCAROUTER_KEY_DASHBOARD_URL =
  "https://www.orcarouter.ai/console/authorized-apps";

export interface OrcarouterOrigins {
  /** Origin used for `/auth` and the code exchange. */
  readonly authBaseUrl: string;
  /** Origin used for `/v1/models` and inference. */
  readonly apiBaseUrl: string;
}

export interface OrcarouterOriginOverrides {
  /** One origin serving both roles, for self-hosted deployments. */
  readonly baseUrl?: string;
  /** Explicit override; wins over `baseUrl`. */
  readonly authBaseUrl?: string;
  /** Explicit override; wins over `baseUrl`. */
  readonly apiBaseUrl?: string;
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

function normalizeBaseUrl(value: string, role: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`The OrcaRouter ${role} base URL must not be empty.`);
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      `The OrcaRouter ${role} base URL is not a valid absolute URL.`,
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`The OrcaRouter ${role} base URL must use http or https.`);
  }
  // Plain HTTP is only acceptable when the target is the local machine.
  if (url.protocol === "http:" && !isLoopbackHostname(url.hostname)) {
    throw new Error(
      `The OrcaRouter ${role} base URL must use https unless it points at loopback.`,
    );
  }
  if (url.username || url.password) {
    throw new Error(
      `The OrcaRouter ${role} base URL must not contain userinfo.`,
    );
  }
  if (url.search || url.hash) {
    throw new Error(
      `The OrcaRouter ${role} base URL must not contain a query or fragment.`,
    );
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}

/**
 * Resolve the auth and inference origins. Explicit per-role overrides take
 * precedence over the shared self-hosted base, which in turn falls back to the
 * public defaults.
 */
export function resolveOrcarouterOrigins(
  overrides: OrcarouterOriginOverrides = {},
): OrcarouterOrigins {
  const shared = overrides.baseUrl?.trim();
  const auth =
    overrides.authBaseUrl?.trim() || shared || DEFAULT_ORCAROUTER_AUTH_BASE_URL;
  const api =
    overrides.apiBaseUrl?.trim() || shared || DEFAULT_ORCAROUTER_API_BASE_URL;
  return {
    authBaseUrl: normalizeBaseUrl(auth, "auth"),
    apiBaseUrl: normalizeBaseUrl(api, "inference"),
  };
}

/** Read overrides from the process environment, if present. */
export function readOrcarouterOriginOverrides(
  env: Record<string, string | undefined>,
): OrcarouterOriginOverrides {
  return {
    baseUrl: env.ORCA_BASE_URL,
    authBaseUrl: env.ORCA_AUTH_BASE_URL,
    apiBaseUrl: env.ORCA_API_BASE_URL,
  };
}

/** Read overrides from `process.env` without requiring Node types. */
export function resolveOrcarouterOriginsFromEnv(): OrcarouterOrigins {
  const env = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  return resolveOrcarouterOrigins(
    env ? readOrcarouterOriginOverrides(env) : {},
  );
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

export function orcarouterAuthorizeUrl(origins: OrcarouterOrigins): string {
  return joinUrl(origins.authBaseUrl, ORCAROUTER_AUTHORIZE_PATH);
}

export function orcarouterExchangeUrl(origins: OrcarouterOrigins): string {
  return joinUrl(origins.authBaseUrl, ORCAROUTER_EXCHANGE_PATH);
}

export function orcarouterModelsUrl(origins: OrcarouterOrigins): string {
  return joinUrl(origins.apiBaseUrl, ORCAROUTER_MODELS_PATH);
}

export function orcarouterChatCompletionsUrl(
  origins: OrcarouterOrigins,
): string {
  return joinUrl(origins.apiBaseUrl, ORCAROUTER_CHAT_COMPLETIONS_PATH);
}

/**
 * Validate a `callback_url` the way the consent endpoint does, before a browser
 * is ever opened, so a doomed attempt fails in-process.
 */
export function validateCallbackUrl(callbackUrl: string): string {
  if (callbackUrl === "oob") return callbackUrl;
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    throw new Error("The OAuth callback URL is not a valid absolute URL.");
  }
  if (url.username || url.password) {
    throw new Error("The OAuth callback URL must not contain userinfo.");
  }
  if (url.hash) {
    throw new Error("The OAuth callback URL must not contain a fragment.");
  }
  if (url.protocol === "http:") {
    if (!isLoopbackHostname(url.hostname)) {
      throw new Error(
        "An http OAuth callback URL is only allowed for localhost, 127.0.0.1 or [::1].",
      );
    }
    return url.toString();
  }
  if (url.protocol !== "https:") {
    throw new Error(
      "The OAuth callback URL must use https, or http on loopback.",
    );
  }
  return url.toString();
}

/**
 * OAuth 2.0 authorization-code flow with PKCE for OrcaRouter.
 *
 * Flow A (loopback redirect) and Flow B (out-of-band code) share everything
 * except how the code reaches the process. The exchange always presents the
 * original verifier; the verifier never leaves the process and is never logged,
 * printed, or placed in a URL.
 *
 * No client secret is involved and no redirect URI is pre-registered.
 */

import {
  ORCAROUTER_AUTHORIZE_PATH,
  ORCAROUTER_EXCHANGE_PATH,
  validateCallbackUrl,
  type OrcarouterOrigins,
} from "./origins";

export type OrcaAuthErrorCode =
  | "denied"
  | "state_mismatch"
  | "cancelled"
  | "timeout"
  | "exchange_failed"
  | "invalid_response"
  | "insufficient_scope"
  | "network";

/**
 * A terminal, actionable failure. Messages are built only from status codes and
 * protocol-level error names; upstream response bodies are never echoed because
 * they may contain credential material.
 */
export class OrcaAuthError extends Error {
  readonly code: OrcaAuthErrorCode;
  readonly status?: number;

  constructor(code: OrcaAuthErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OrcaAuthError";
    this.code = code;
    this.status = status;
  }
}

export interface OrcaPkceAttempt {
  /** High-entropy secret. Stays in-process until the exchange. */
  readonly codeVerifier: string;
  /** `base64url(sha256(verifier))`, no padding. Safe to put in a URL. */
  readonly codeChallenge: string;
  /** Opaque CSRF token, echoed back by the consent screen. */
  readonly state: string;
}

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Unpadded base64url. Implemented locally so no Buffer is required. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += BASE64URL_ALPHABET[b0 >> 2];
    out += BASE64URL_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += BASE64URL_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += BASE64URL_ALPHABET[b2 & 0x3f];
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return new Uint8Array(digest);
}

/**
 * Build a fresh attempt. A new verifier and state are generated for every
 * authorization attempt from a cryptographic RNG.
 */
export async function createOrcaPkceAttempt(): Promise<OrcaPkceAttempt> {
  const codeVerifier = base64UrlEncode(randomBytes(32));
  return {
    codeVerifier,
    codeChallenge: base64UrlEncode(await sha256(codeVerifier)),
    state: base64UrlEncode(randomBytes(16)),
  };
}

/** Length-independent comparison, used for the Flow A `state` check. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export type OrcaAuthorizationScope = "api" | "connector";

export interface OrcaAuthorizeUrlOptions {
  readonly origins: OrcarouterOrigins;
  /** An absolute URL, or the literal `oob` for the out-of-band flow. */
  readonly callbackUrl: string;
  readonly attempt: OrcaPkceAttempt;
  readonly appName: string;
  /** Defaults to `api`, the scope inference requires. */
  readonly scope?: OrcaAuthorizationScope;
  readonly loginHint?: string;
  readonly workspaceHint?: string;
  readonly prompt?: "consent";
}

export function buildOrcaAuthorizeUrl(
  options: OrcaAuthorizeUrlOptions,
): string {
  const url = new URL(ORCAROUTER_AUTHORIZE_PATH, options.origins.authBaseUrl);
  url.searchParams.set(
    "callback_url",
    validateCallbackUrl(options.callbackUrl),
  );
  url.searchParams.set("code_challenge", options.attempt.codeChallenge);
  // Always S256: the consent screen lets the user choose "show me a code" even
  // on a redirect flow, and a displayed code must not be redeemable by anyone
  // who merely saw the authorize URL.
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", options.attempt.state);
  url.searchParams.set("app_name", options.appName);
  url.searchParams.set("scope", options.scope ?? "api");
  if (options.loginHint) url.searchParams.set("login_hint", options.loginHint);
  if (options.workspaceHint)
    url.searchParams.set("workspace_hint", options.workspaceHint);
  if (options.prompt) url.searchParams.set("prompt", options.prompt);
  return url.toString();
}

export interface OrcaExchangeResult {
  /** A normal, durable OrcaRouter API key. Not a refresh token. */
  readonly key: string;
  readonly userId: string | null;
  /** The scope that was *granted*, or null when the server did not report one. */
  readonly grantedScope: string | null;
}

const SAFE_ERROR_NAME = /^[a-z_]{1,40}$/;

/** Extract only a protocol-level error name; never the rest of the body. */
function safeErrorName(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>).error;
  return typeof value === "string" && SAFE_ERROR_NAME.test(value)
    ? value
    : null;
}

export interface OrcaExchangeOptions {
  readonly origins: OrcarouterOrigins;
  readonly code: string;
  readonly attempt: OrcaPkceAttempt;
  readonly fetch?: typeof globalThis.fetch;
  readonly signal?: AbortSignal;
  /** Scopes this client can actually use. Defaults to `["api"]`. */
  readonly acceptedScopes?: readonly string[];
}

/**
 * Redeem an auth code at the auth origin's `/api/v1/auth/keys`. Auth codes are
 * single-use with a 10 minute TTL.
 */
export async function exchangeOrcaAuthCode(
  options: OrcaExchangeOptions,
): Promise<OrcaExchangeResult> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const code = options.code?.trim();
  if (!code) {
    throw new OrcaAuthError(
      "invalid_response",
      "No authorization code was provided.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(
      `${options.origins.authBaseUrl}${ORCAROUTER_EXCHANGE_PATH}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: options.attempt.codeVerifier,
          code_challenge_method: "S256",
        }),
        signal: options.signal,
        cache: "no-store",
      },
    );
  } catch (error) {
    if (error instanceof OrcaAuthError) throw error;
    if (options.signal?.aborted) {
      throw new OrcaAuthError(
        "cancelled",
        "OrcaRouter authorization was cancelled.",
      );
    }
    throw new OrcaAuthError(
      "network",
      "Could not reach the OrcaRouter authorization service. Check your network and try again.",
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const name = safeErrorName(body);
    const suffix = name ? ` (${name})` : "";
    if (response.status === 403) {
      throw new OrcaAuthError(
        "exchange_failed",
        `OrcaRouter rejected this authorization code: it is unknown, expired, already used, or the verifier did not match${suffix}. Start a new connection.`,
        403,
      );
    }
    if (response.status === 400) {
      throw new OrcaAuthError(
        "exchange_failed",
        `OrcaRouter rejected the code challenge method${suffix}. Start a new connection.`,
        400,
      );
    }
    if (response.status === 429) {
      throw new OrcaAuthError(
        "exchange_failed",
        "Too many OrcaRouter authorizations were started recently. Wait for an existing key or try again later.",
        429,
      );
    }
    throw new OrcaAuthError(
      "exchange_failed",
      `OrcaRouter authorization failed with status ${response.status}${suffix}.`,
      response.status,
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (typeof payload !== "object" || payload === null) {
    throw new OrcaAuthError(
      "invalid_response",
      "OrcaRouter returned an authorization response that could not be read.",
    );
  }
  const record = payload as Record<string, unknown>;
  const key = record.key;
  if (typeof key !== "string" || !key.trim()) {
    throw new OrcaAuthError(
      "invalid_response",
      "OrcaRouter returned an authorization response without a usable key.",
    );
  }

  const grantedScope =
    typeof record.scope === "string" && record.scope.trim()
      ? record.scope.trim()
      : null;
  const accepted = options.acceptedScopes ?? ["api"];
  // A granted scope narrower than what this client needs is not usable. Do not
  // treat the requested scope as if it had been granted.
  if (grantedScope !== null && !accepted.includes(grantedScope)) {
    throw new OrcaAuthError(
      "insufficient_scope",
      `OrcaRouter granted the "${grantedScope}" scope, which cannot be used for inference. Ask a workspace owner to grant "${accepted.join('" or "')}".`,
    );
  }

  return {
    key,
    userId: typeof record.user_id === "string" ? record.user_id : null,
    grantedScope,
  };
}

/**
 * The device grant (Flow C) is a supported protocol but is not implemented by
 * this integration: a loopback listener is available on the server that runs
 * the connect flow, and the out-of-band flow covers deployments where it is
 * not. Exported so callers can detect and explain the gap.
 */
export const ORCAROUTER_UNSUPPORTED_FLOWS = ["device_grant"] as const;

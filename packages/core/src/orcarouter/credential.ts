/**
 * OrcaRouter credentials.
 *
 * Both entry points — a pasted API key and an OAuth 2.0 + PKCE login — produce
 * the same thing: a normal, durable OrcaRouter API key. Everything downstream
 * (inference, model discovery) consumes `OrcaCredentialResult` and never learns
 * where the key came from.
 */

import {
  OrcaAuthError,
  buildOrcaAuthorizeUrl,
  constantTimeEqual,
  createOrcaPkceAttempt,
  exchangeOrcaAuthCode,
  type OrcaAuthorizationScope,
} from "./pkce";
import type { OrcarouterOrigins } from "./origins";

export type OrcaCredentialMethod = "api_key" | "orcarouter-oauth";

export const ORCA_API_KEY_PREFIX = "sk-orca-";

/** A credential handed to the transport. Never serialized, never logged. */
export interface OrcaCredentialResult {
  /** The bearer token. A durable key, not a refresh token. */
  readonly apiKey: string;
  readonly method: OrcaCredentialMethod;
  /** The scope the server reported as granted, when it reported one. */
  readonly grantedScope: string | null;
  /** Stable account identifier for the issuing user, when known. */
  readonly accountId: string | null;
}

export interface OrcaStoredCredential extends OrcaCredentialResult {
  /**
   * Monotonic counter, incremented on every successful replacement. Used to
   * make a `401` from an in-flight request unable to mark a newer credential
   * as broken.
   */
  readonly generation: number;
  readonly status: "active" | "needs_reauth";
  readonly issuedAt: string;
  /** Present only when `status` is `needs_reauth`. */
  readonly reauthReason: string | null;
}

/** Mask a key for display. The plaintext never reaches a UI or a log. */
export function redactOrcaApiKey(apiKey: string | null | undefined): string {
  if (typeof apiKey !== "string" || !apiKey) return "";
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 8)}••••${trimmed.slice(-4)}`;
}

export interface OrcaApiKeyValidation {
  readonly ok: boolean;
  /** User-facing problem description. Never contains the key. */
  readonly problem: string | null;
}

/**
 * Lightweight format check only. An `sk-orca-` prefix is not proof that a key
 * is valid; there is no free validation request, so the first real call
 * establishes validity.
 */
export function validateOrcaApiKey(apiKey: string): OrcaApiKeyValidation {
  const trimmed = apiKey?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, problem: "Enter an OrcaRouter API key." };
  }
  if (/\s/.test(trimmed)) {
    return {
      ok: false,
      problem: "An OrcaRouter API key cannot contain whitespace.",
    };
  }
  if (!trimmed.startsWith(ORCA_API_KEY_PREFIX)) {
    return {
      ok: false,
      problem: `An OrcaRouter API key starts with "${ORCA_API_KEY_PREFIX}".`,
    };
  }
  if (trimmed.length <= ORCA_API_KEY_PREFIX.length) {
    return { ok: false, problem: "That OrcaRouter API key is incomplete." };
  }
  return { ok: true, problem: null };
}

/**
 * The credential seam. Adding an authentication method means adding one
 * adapter; nothing downstream changes.
 */
export interface OrcaCredentialSource {
  readonly method: OrcaCredentialMethod;
  readonly label: string;
  acquire(signal?: AbortSignal): Promise<OrcaCredentialResult>;
}

export function createOrcaApiKeySource(apiKey: string): OrcaCredentialSource {
  return {
    method: "api_key",
    label: "OrcaRouter - API",
    async acquire() {
      const validation = validateOrcaApiKey(apiKey);
      if (!validation.ok) {
        throw new OrcaAuthError(
          "invalid_response",
          validation.problem ?? "That OrcaRouter API key is not usable.",
        );
      }
      return {
        apiKey: apiKey.trim(),
        method: "api_key",
        grantedScope: null,
        accountId: null,
      };
    },
  };
}

/** What a loopback listener or a prompt hands back to the PKCE adapter. */
export interface OrcaCallbackResult {
  readonly code: string | null;
  readonly error: string | null;
  readonly state: string | null;
}

export interface OrcaCodeReceiver {
  /** The `callback_url` to send to the consent screen. */
  readonly callbackUrl: string;
  waitForCallback(): Promise<OrcaCallbackResult>;
  /** Release the listener and any pending wait. Idempotent. */
  cancel(): void;
}

export interface OrcaPkceSourceDependencies {
  readonly origins: OrcarouterOrigins;
  /** Shown on the consent screen as a claim by the requesting app. */
  readonly appName: string;
  /**
   * `loopback` opens a browser and receives the code on `127.0.0.1`;
   * `oob` displays the authorize URL and reads the code back from the user.
   */
  readonly flow: "loopback" | "oob";
  /** Required for `loopback`. */
  readonly createCodeReceiver?: () => Promise<OrcaCodeReceiver>;
  /** Required for `oob`. Receives the authorize URL, resolves with the code. */
  readonly requestCode?: (
    authorizeUrl: string,
    signal?: AbortSignal,
  ) => Promise<string>;
  readonly openBrowser?: (url: string) => void;
  readonly fetch?: typeof globalThis.fetch;
  readonly scope?: OrcaAuthorizationScope;
  readonly acceptedScopes?: readonly string[];
  readonly loginHint?: string;
  readonly workspaceHint?: string;
  /** Test seam; production callers use the default. */
  readonly createAttempt?: typeof createOrcaPkceAttempt;
  readonly buildAuthorizeUrl?: typeof buildOrcaAuthorizeUrl;
  readonly exchange?: typeof exchangeOrcaAuthCode;
}

/**
 * The OAuth 2.0 + PKCE adapter. It never holds a client secret and never needs
 * a pre-registered redirect URI.
 */
export function createOrcaPkceSource(
  dependencies: OrcaPkceSourceDependencies,
): OrcaCredentialSource {
  return {
    method: "orcarouter-oauth",
    label: "OrcaRouter - Auth",
    async acquire(signal) {
      const createAttempt = dependencies.createAttempt ?? createOrcaPkceAttempt;
      const buildUrl = dependencies.buildAuthorizeUrl ?? buildOrcaAuthorizeUrl;
      const exchange = dependencies.exchange ?? exchangeOrcaAuthCode;

      // A fresh verifier and state for every attempt.
      const attempt = await createAttempt();

      let receiver: OrcaCodeReceiver | null = null;
      let code: string;
      if (dependencies.flow === "loopback") {
        if (!dependencies.createCodeReceiver) {
          throw new OrcaAuthError(
            "invalid_response",
            "The loopback flow needs a code receiver.",
          );
        }
        receiver = await dependencies.createCodeReceiver();
        const authorizeUrl = buildUrl({
          origins: dependencies.origins,
          callbackUrl: receiver.callbackUrl,
          attempt,
          appName: dependencies.appName,
          scope: dependencies.scope,
          loginHint: dependencies.loginHint,
          workspaceHint: dependencies.workspaceHint,
        });
        dependencies.openBrowser?.(authorizeUrl);
        let callback: OrcaCallbackResult;
        try {
          callback = await receiver.waitForCallback();
        } catch (error) {
          receiver.cancel();
          if (error instanceof OrcaAuthError) throw error;
          throw new OrcaAuthError(
            "cancelled",
            "OrcaRouter authorization was cancelled.",
          );
        }
        // The state check is the only thing standing between this listener and
        // a code somebody else's page dropped on it. Compare before anything
        // else, and before the code is touched.
        if (
          callback.state === null ||
          !constantTimeEqual(callback.state, attempt.state)
        ) {
          throw new OrcaAuthError(
            "state_mismatch",
            "The OrcaRouter authorization response did not match this request. Nothing was stored.",
          );
        }
        if (callback.error) {
          throw new OrcaAuthError(
            "denied",
            `OrcaRouter authorization was declined (${callback.error}).`,
          );
        }
        if (!callback.code) {
          throw new OrcaAuthError(
            "invalid_response",
            "The OrcaRouter authorization response did not include a code.",
          );
        }
        code = callback.code;
      } else {
        if (!dependencies.requestCode) {
          throw new OrcaAuthError(
            "invalid_response",
            "The out-of-band flow needs a way to read the code back.",
          );
        }
        const authorizeUrl = buildUrl({
          origins: dependencies.origins,
          callbackUrl: "oob",
          attempt,
          appName: dependencies.appName,
          scope: dependencies.scope,
          loginHint: dependencies.loginHint,
          workspaceHint: dependencies.workspaceHint,
        });
        dependencies.openBrowser?.(authorizeUrl);
        const pasted = await dependencies.requestCode(authorizeUrl, signal);
        const trimmed = pasted?.trim() ?? "";
        if (!trimmed) {
          throw new OrcaAuthError(
            "cancelled",
            "No OrcaRouter authorization code was entered.",
          );
        }
        code = trimmed;
      }

      const result = await exchange({
        origins: dependencies.origins,
        code,
        attempt,
        fetch: dependencies.fetch,
        signal,
        acceptedScopes: dependencies.acceptedScopes,
      });

      return {
        apiKey: result.key,
        method: "orcarouter-oauth",
        grantedScope: result.grantedScope,
        accountId: result.userId,
      };
    },
  };
}

/**
 * Classify an inference failure. A `401` is terminal: the credential was
 * revoked or is invalid, and the answer is to re-run the connect flow, never to
 * attempt a refresh — OrcaRouter issues durable keys with no refresh grant.
 */
export function classifyOrcaInferenceFailure(status: number): {
  readonly terminal: boolean;
  readonly reason: string | null;
} {
  if (status === 401) {
    return {
      terminal: true,
      reason:
        "OrcaRouter rejected this key. It may have been revoked. Reconnect with OrcaRouter to issue a new key.",
    };
  }
  if (status === 403) {
    return {
      terminal: true,
      reason:
        "OrcaRouter denied this key access to the requested resource. Check the workspace role that granted it.",
    };
  }
  return { terminal: false, reason: null };
}

/**
 * The OrcaRouter provider entry for the json-render web app.
 *
 * OrcaRouter is an OpenAI-compatible AI gateway that routes many providers
 * behind one endpoint. It appears as a named provider with two explicit
 * authentication choices: paste an `sk-orca-…` API key, or sign in with an
 * OrcaRouter account (OAuth 2.0 + PKCE).
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  resolveOrcarouterOriginsFromEnv,
  type OrcarouterOrigins,
} from "@json-render/core";
import { getOrcaServerState } from "./server-store";

export const ORCAROUTER_PROVIDER_ID = "orcarouter";
export const ORCAROUTER_API_KEY_PROVIDER_ID = "orcarouter";
export const ORCAROUTER_AUTH_PROVIDER_ID = "orcarouter-oauth";

export const ORCAROUTER_API_KEY_LABEL = "OrcaRouter - API";
export const ORCAROUTER_AUTH_LABEL = "OrcaRouter - Auth";

export const ORCAROUTER_DEFAULT_MODEL = "orcarouter/auto";

/** The AI SDK model string for a provider selection. */
export function toModelString(provider: string, model: string): string {
  return `${provider}/${model}`;
}

/** Whether a provider selection should route through OrcaRouter. */
export function isOrcarouterProvider(provider: string): boolean {
  return (
    provider === ORCAROUTER_API_KEY_PROVIDER_ID ||
    provider === ORCAROUTER_AUTH_PROVIDER_ID
  );
}

export interface OrcarouterTransport {
  /** The AI SDK model instance to hand to `streamText`. */
  model: ReturnType<ReturnType<typeof createOpenAICompatible>["chatModel"]>;
  origins: OrcarouterOrigins;
  /** Masked, safe to display. */
  maskedKey: string;
  /** Which entry point supplied the credential. */
  method: string;
}

/**
 * Build the OrcaRouter transport from the active credential. Throws when no
 * usable credential exists, so callers can return an actionable message instead
 * of sending an unauthenticated request.
 */
export function createOrcarouterTransport(
  modelId: string,
): OrcarouterTransport {
  const { store, origins } = getOrcaServerState();
  const credential = store.getUsableCredential();
  if (!credential) {
    throw new OrcaRouterNotConnectedError(
      store.needsReauth
        ? (store.getCredential()?.reauthReason ??
            "Your OrcaRouter key is no longer accepted. Reconnect to issue a new one.")
        : "Connect to OrcaRouter with an API key or your OrcaRouter account first.",
    );
  }
  const provider = createOpenAICompatible({
    name: ORCAROUTER_PROVIDER_ID,
    baseURL: `${origins.apiBaseUrl}/v1`,
    apiKey: credential.apiKey,
  });
  return {
    model: provider.chatModel(modelId),
    origins,
    maskedKey: `${credential.apiKey.slice(0, 8)}••••${credential.apiKey.slice(-4)}`,
    method: credential.method,
  };
}

export class OrcaRouterNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrcaRouterNotConnectedError";
  }
}

export function orcarouterOrigins(): OrcarouterOrigins {
  return resolveOrcarouterOriginsFromEnv();
}

/**
 * Client-safe OrcaRouter constants.
 *
 * Re-exported rather than imported from the package barrel so the browser
 * bundle does not pull in the server-side catalog and credential modules.
 */

export const ORCAROUTER_KEY_DASHBOARD_URL =
  "https://www.orcarouter.ai/console/authorized-apps";

export const ORCAROUTER_PROVIDER_ID = "orcarouter";
export const ORCAROUTER_AUTH_PROVIDER_ID = "orcarouter-oauth";
export const ORCAROUTER_API_KEY_LABEL = "OrcaRouter - API";
export const ORCAROUTER_AUTH_LABEL = "OrcaRouter - Auth";
export const ORCAROUTER_DEFAULT_MODEL = "orcarouter/auto";

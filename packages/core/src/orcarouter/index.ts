/**
 * OrcaRouter as a first-class provider for json-render.
 *
 * OrcaRouter is an OpenAI-compatible AI gateway that routes many providers
 * behind one endpoint. This module is the reusable seam: origin resolution,
 * the two credential sources (a pasted API key and an OAuth 2.0 + PKCE login),
 * the generation-safe credential store, and live model discovery.
 *
 * The inference transport itself is supplied by the host through
 * `@ai-sdk/openai-compatible`, so this package stays dependency-light.
 */

export {
  DEFAULT_ORCAROUTER_API_BASE_URL,
  DEFAULT_ORCAROUTER_AUTH_BASE_URL,
  ORCAROUTER_AUTHORIZE_PATH,
  ORCAROUTER_CHAT_COMPLETIONS_PATH,
  ORCAROUTER_DEVICE_CODE_PATH,
  ORCAROUTER_DEVICE_TOKEN_PATH,
  ORCAROUTER_EXCHANGE_PATH,
  ORCAROUTER_KEY_DASHBOARD_URL,
  ORCAROUTER_MODELS_PATH,
  isLoopbackHostname,
  orcarouterAuthorizeUrl,
  orcarouterChatCompletionsUrl,
  orcarouterExchangeUrl,
  orcarouterModelsUrl,
  readOrcarouterOriginOverrides,
  resolveOrcarouterOrigins,
  resolveOrcarouterOriginsFromEnv,
  validateCallbackUrl,
} from "./origins";
export type { OrcarouterOriginOverrides, OrcarouterOrigins } from "./origins";

export {
  ORCAROUTER_UNSUPPORTED_FLOWS,
  OrcaAuthError,
  base64UrlEncode,
  buildOrcaAuthorizeUrl,
  constantTimeEqual,
  createOrcaPkceAttempt,
  exchangeOrcaAuthCode,
} from "./pkce";
export type {
  OrcaAuthErrorCode,
  OrcaAuthorizationScope,
  OrcaAuthorizeUrlOptions,
  OrcaExchangeOptions,
  OrcaExchangeResult,
  OrcaPkceAttempt,
} from "./pkce";

export {
  ORCAROUTER_SEED_MODELS,
  OrcaCatalogError,
  DEFAULT_CATALOG_TIMEOUT_MS,
  MAX_CATALOG_BYTES,
  MAX_CATALOG_MODELS,
  fetchOrcaCatalog,
  isOrcaModelCompatible,
  modelSupportsCapability,
  modelSupportsInputModality,
  orcaCatalogUrl,
  orcarouterSeedCatalog,
  parseOrcaCatalogPayload,
  parseOrcaModelRecord,
  selectOrcaModels,
} from "./catalog";
export type {
  FetchOrcaCatalogOptions,
  OrcaCapability,
  OrcaCatalog,
  OrcaInputModality,
  OrcaModel,
  OrcaModelArchitecture,
  SelectOrcaModelsOptions,
} from "./catalog";

export {
  ORCA_API_KEY_PREFIX,
  classifyOrcaInferenceFailure,
  createOrcaApiKeySource,
  createOrcaPkceSource,
  redactOrcaApiKey,
  validateOrcaApiKey,
} from "./credential";
export type {
  OrcaApiKeyValidation,
  OrcaCallbackResult,
  OrcaCodeReceiver,
  OrcaCredentialMethod,
  OrcaCredentialResult,
  OrcaCredentialSource,
  OrcaPkceSourceDependencies,
  OrcaStoredCredential,
} from "./credential";

export {
  OrcaCredentialStore,
  deserializeOrcaCredentialStore,
  serializeOrcaCredentialStore,
} from "./credential-store";
export type {
  OrcaCredentialStoreSnapshot,
  SerializedOrcaCredentialStore,
} from "./credential-store";

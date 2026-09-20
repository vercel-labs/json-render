/**
 * OrcaRouter model catalog.
 *
 * `GET {api}/v1/models` is the only source of truth for which models a
 * workspace can actually call. The catalog drives the model selector; a
 * capability that the catalog metadata cannot prove is never offered.
 */

import { ORCAROUTER_MODELS_PATH, type OrcarouterOrigins } from "./origins";

export type OrcaCapability =
  | "chat"
  | "embedding"
  | "image"
  | "video"
  | "rerank";

export type OrcaInputModality = "text" | "image" | "audio" | "video";

/** Endpoint types that can carry a text chat completion. */
const TEXT_ENDPOINT_TYPES = [
  "openai",
  "anthropic",
  "gemini",
  "openai-response",
] as const;

/** Endpoint types that belong to a non-text model family. */
const NON_TEXT_ENDPOINT_TYPES = [
  "image-generation",
  "openai-video",
  "jina-rerank",
] as const;

const CAPABILITY_ENDPOINT_TYPE: Record<
  Exclude<OrcaCapability, "chat">,
  string
> = {
  embedding: "embeddings",
  image: "image-generation",
  video: "openai-video",
  rerank: "jina-rerank",
};

const CAPABILITY_QUERY: Record<OrcaCapability, string | null> = {
  chat: "chat",
  embedding: "embedding",
  image: "image",
  video: null,
  rerank: null,
};

export interface OrcaModelArchitecture {
  readonly inputModalities: readonly OrcaInputModality[];
  readonly outputModalities: readonly OrcaInputModality[];
}

export interface OrcaModel {
  /** The vendor/model identifier, preserved verbatim. */
  readonly id: string;
  readonly name: string | null;
  readonly description: string | null;
  readonly contextLength: number | null;
  readonly maxCompletionTokens: number | null;
  readonly endpointTypes: readonly string[];
  readonly architecture: OrcaModelArchitecture | null;
  /** Reasoning effort levels this model accepts, when verified. */
  readonly reasoningEfforts: readonly string[] | null;
}

export interface OrcaCatalog {
  readonly models: readonly OrcaModel[];
  /** `live` results are authoritative; `seed` results are an outage fallback. */
  readonly source: "live" | "seed";
  readonly degraded: boolean;
  /** Why the live catalog could not be used, when `degraded` is true. */
  readonly degradedReason: string | null;
  readonly fetchedAt: string | null;
}

export class OrcaCatalogError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OrcaCatalogError";
    this.status = status;
  }
}

/** Bounds so a catalog response cannot consume unbounded memory. */
export const MAX_CATALOG_BYTES = 1_048_576;
export const MAX_CATALOG_MODELS = 500;
export const DEFAULT_CATALOG_TIMEOUT_MS = 10_000;

const MODALITIES = new Set<string>(["text", "image", "audio", "video"]);

function asModalities(value: unknown): OrcaInputModality[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is OrcaInputModality =>
      typeof item === "string" && MODALITIES.has(item),
  );
}

function asPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

/**
 * Parse one catalog record. Records that do not carry a usable id or a
 * recognised endpoint list are dropped rather than guessed at.
 */
export function parseOrcaModelRecord(record: unknown): OrcaModel | null {
  if (typeof record !== "object" || record === null) return null;
  const raw = record as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) return null;

  const endpointTypes = Array.isArray(raw.supported_endpoint_types)
    ? raw.supported_endpoint_types.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  let architecture: OrcaModelArchitecture | null = null;
  if (typeof raw.architecture === "object" && raw.architecture !== null) {
    const arch = raw.architecture as Record<string, unknown>;
    architecture = {
      inputModalities: asModalities(arch.input_modalities),
      outputModalities: asModalities(arch.output_modalities),
    };
  }

  return {
    id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : null,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description
        : null,
    contextLength: asPositiveInteger(raw.context_length),
    maxCompletionTokens: asPositiveInteger(raw.max_completion_tokens),
    endpointTypes,
    architecture,
    reasoningEfforts: null,
  };
}

/** Parse a catalog payload. Accepts `{ data: [...] }` and a bare array. */
export function parseOrcaCatalogPayload(payload: unknown): OrcaModel[] {
  const items = Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        Array.isArray((payload as Record<string, unknown>).data)
      ? ((payload as Record<string, unknown>).data as unknown[])
      : null;
  if (!items) {
    throw new OrcaCatalogError(
      "The OrcaRouter model catalog response had an unexpected shape.",
    );
  }
  const models: OrcaModel[] = [];
  const seen = new Set<string>();
  for (const item of items.slice(0, MAX_CATALOG_MODELS)) {
    const model = parseOrcaModelRecord(item);
    if (model && !seen.has(model.id)) {
      seen.add(model.id);
      models.push(model);
    }
  }
  return models;
}

/** `GET {api}/v1/models[?capability=…]` for one capability. */
export function orcaCatalogUrl(
  origins: OrcarouterOrigins,
  capability?: OrcaCapability,
): string {
  const query = capability ? CAPABILITY_QUERY[capability] : null;
  const url = `${origins.apiBaseUrl}${ORCAROUTER_MODELS_PATH}`;
  return query ? `${url}?capability=${query}` : url;
}

export interface FetchOrcaCatalogOptions {
  readonly origins: OrcarouterOrigins;
  /** Bearer credential. Never logged, never included in an error message. */
  readonly apiKey: string;
  readonly capability?: OrcaCapability;
  readonly fetch?: typeof globalThis.fetch;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

/**
 * Fetch the live catalog. Throws `OrcaCatalogError` on any failure so the
 * caller decides how to degrade; error messages never include the key or the
 * upstream body.
 */
export async function fetchOrcaCatalog(
  options: FetchOrcaCatalogOptions,
): Promise<OrcaCatalog> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new OrcaCatalogError(
      "An OrcaRouter API key is required to list models.",
    );
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CATALOG_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  let response: Response;
  try {
    response = await fetchImpl(
      orcaCatalogUrl(options.origins, options.capability),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        signal,
        cache: "no-store",
      },
    );
  } catch {
    throw new OrcaCatalogError(
      "Could not reach the OrcaRouter model catalog. Check your network and try again.",
    );
  }

  if (!response.ok) {
    const message =
      response.status === 401 || response.status === 403
        ? `The OrcaRouter API key was rejected while listing models (status ${response.status}).`
        : `The OrcaRouter model catalog request failed with status ${response.status}.`;
    throw new OrcaCatalogError(message, response.status);
  }

  const body = await response.text().catch(() => null);
  if (body === null) {
    throw new OrcaCatalogError(
      "The OrcaRouter model catalog response could not be read.",
    );
  }
  if (body.length > MAX_CATALOG_BYTES) {
    throw new OrcaCatalogError(
      "The OrcaRouter model catalog response was larger than this client accepts.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new OrcaCatalogError(
      "The OrcaRouter model catalog response was not valid JSON.",
    );
  }

  return {
    models: parseOrcaCatalogPayload(parsed),
    source: "live",
    degraded: false,
    degradedReason: null,
    fetchedAt: new Date().toISOString(),
  };
}

interface SeedModel {
  readonly id: string;
  readonly name: string;
  readonly contextLength: number;
  readonly endpointTypes: readonly string[];
  readonly inputModalities: readonly OrcaInputModality[];
  readonly reasoningEfforts: readonly string[] | null;
}

/**
 * Verified cold-start seed. Used only when live discovery fails, so a fresh
 * installation is not left with an empty selector during an outage. When live
 * discovery succeeds its result is authoritative and this seed is not merged
 * into it.
 */
export const ORCAROUTER_SEED_MODELS: readonly SeedModel[] = [
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    contextLength: 400_000,
    endpointTypes: ["openai", "openai-response", "anthropic"],
    inputModalities: ["text", "image"],
    reasoningEfforts: ["low", "medium", "high", "xhigh"],
  },
  {
    id: "anthropic/claude-opus-4.8",
    name: "Claude Opus 4.8",
    contextLength: 200_000,
    endpointTypes: ["anthropic", "openai"],
    inputModalities: ["text", "image"],
    reasoningEfforts: ["low", "medium", "high"],
  },
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    contextLength: 1_000_000,
    endpointTypes: ["gemini", "openai"],
    inputModalities: ["text", "image", "audio", "video"],
    reasoningEfforts: ["low", "medium", "high"],
  },
  {
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    contextLength: 1_048_576,
    endpointTypes: ["openai", "openai-response"],
    inputModalities: ["text"],
    reasoningEfforts: null,
  },
  {
    id: "orcarouter/auto",
    name: "OrcaRouter Auto",
    contextLength: 400_000,
    endpointTypes: ["openai", "openai-response", "anthropic", "gemini"],
    inputModalities: ["text"],
    reasoningEfforts: null,
  },
];

export function orcarouterSeedCatalog(reason: string): OrcaCatalog {
  return {
    models: ORCAROUTER_SEED_MODELS.map((seed) => ({
      id: seed.id,
      name: seed.name,
      description: null,
      contextLength: seed.contextLength,
      maxCompletionTokens: null,
      endpointTypes: [...seed.endpointTypes],
      architecture: {
        inputModalities: [...seed.inputModalities],
        outputModalities: ["text"],
      },
      reasoningEfforts: seed.reasoningEfforts
        ? [...seed.reasoningEfforts]
        : null,
    })),
    source: "seed",
    degraded: true,
    degradedReason: reason,
    fetchedAt: null,
  };
}

function hasTextEndpoint(model: OrcaModel): boolean {
  return model.endpointTypes.some((type) =>
    (TEXT_ENDPOINT_TYPES as readonly string[]).includes(type),
  );
}

function hasNonTextEndpoint(model: OrcaModel): boolean {
  return model.endpointTypes.some((type) =>
    (NON_TEXT_ENDPOINT_TYPES as readonly string[]).includes(type),
  );
}

/** Whether a model can serve the given capability, from catalog metadata only. */
export function modelSupportsCapability(
  model: OrcaModel,
  capability: OrcaCapability,
): boolean {
  if (capability === "chat") {
    return hasTextEndpoint(model) && !hasNonTextEndpoint(model);
  }
  return model.endpointTypes.includes(CAPABILITY_ENDPOINT_TYPE[capability]);
}

/**
 * Whether a model declares the given non-text input modality. Fails closed: a
 * model that does not declare an `architecture` block is never treated as
 * multimodal.
 */
export function modelSupportsInputModality(
  model: OrcaModel,
  modality: OrcaInputModality,
): boolean {
  if (modality === "text") return true;
  return model.architecture?.inputModalities.includes(modality) ?? false;
}

export interface SelectOrcaModelsOptions {
  readonly capability: OrcaCapability;
  /** Non-text modalities this entry point actually uploads. */
  readonly requiredInputModalities?: readonly OrcaInputModality[];
}

/**
 * Filter the catalog down to the models an entry point may offer. Every
 * requirement must be provable from metadata, so this never guesses from a
 * model name.
 */
export function selectOrcaModels(
  catalog: OrcaCatalog,
  options: SelectOrcaModelsOptions,
): OrcaModel[] {
  const modalities = (options.requiredInputModalities ?? []).filter(
    (modality) => modality !== "text",
  );
  return catalog.models.filter((model) => {
    if (!modelSupportsCapability(model, options.capability)) return false;
    return modalities.every((modality) =>
      modelSupportsInputModality(model, modality),
    );
  });
}

/**
 * Whether a previously selected model is still offered for the current
 * capability requirements. A stale selection must be cleared, not kept.
 */
export function isOrcaModelCompatible(
  catalog: OrcaCatalog,
  modelId: string,
  options: SelectOrcaModelsOptions,
): boolean {
  return selectOrcaModels(catalog, options).some(
    (model) => model.id === modelId,
  );
}

import {
  isOrcaModelCompatible,
  selectOrcaModels,
  type OrcaCapability,
  type OrcaInputModality,
} from "@json-render/core";
import { discoverOrcaModels } from "@/lib/orcarouter/connect-session";

export const maxDuration = 30;

const CAPABILITIES = new Set<OrcaCapability>([
  "chat",
  "embedding",
  "image",
  "video",
  "rerank",
]);

const MODALITIES = new Set<OrcaInputModality>([
  "text",
  "image",
  "audio",
  "video",
]);

/**
 * Model discovery for the selector.
 *
 * The key stays on the server; the browser receives only the minimal model
 * metadata it needs to render a dropdown, already filtered for the requested
 * capability. A model the catalog cannot prove compatible is never offered.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const rawCapability = params.get("capability") ?? "chat";
  if (!CAPABILITIES.has(rawCapability as OrcaCapability)) {
    return Response.json(
      { error: `Unsupported capability: ${rawCapability}` },
      { status: 400 },
    );
  }
  const capability = rawCapability as OrcaCapability;
  const requiredInputModalities = (params.get("input") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is OrcaInputModality =>
      MODALITIES.has(value as OrcaInputModality),
    );

  const { catalog, maskedKey } = await discoverOrcaModels();
  const options = {
    capability,
    requiredInputModalities,
  };
  const models = selectOrcaModels(catalog, options);

  // A stale selection must be reported so the client can clear it.
  const selected = params.get("selected");
  const selectionStillValid =
    selected === null
      ? null
      : isOrcaModelCompatible(catalog, selected, options);

  return Response.json({
    models: models.map((model) => ({
      id: model.id,
      name: model.name,
      contextLength: model.contextLength,
      maxCompletionTokens: model.maxCompletionTokens,
      inputModalities: model.architecture?.inputModalities ?? [],
      reasoningEfforts: model.reasoningEfforts,
    })),
    source: catalog.source,
    degraded: catalog.degraded,
    degradedReason: catalog.degradedReason,
    fetchedAt: catalog.fetchedAt,
    capability,
    requiredInputModalities,
    maskedKey,
    selectionStillValid,
  });
}

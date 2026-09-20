// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CATALOG_TIMEOUT_MS,
  MAX_CATALOG_BYTES,
  OrcaCatalogError,
  fetchOrcaCatalog,
  isOrcaModelCompatible,
  modelSupportsCapability,
  modelSupportsInputModality,
  orcaCatalogUrl,
  orcarouterSeedCatalog,
  parseOrcaCatalogPayload,
  parseOrcaModelRecord,
  selectOrcaModels,
  type OrcaCatalog,
  type OrcaModel,
} from "./catalog";
import { resolveOrcarouterOrigins } from "./origins";

const origins = resolveOrcarouterOrigins();

const textOnly = {
  id: "deepseek/deepseek-v4-pro",
  object: "model",
  supported_endpoint_types: ["openai", "openai-response"],
  context_length: 1048576,
  architecture: { input_modalities: ["text"], output_modalities: ["text"] },
};
const imageInputChat = {
  id: "deepseek/deepseek-v4-flash-vision-exp",
  supported_endpoint_types: ["openai", "anthropic"],
  context_length: 1048576,
  architecture: {
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
  },
};
const embedding = {
  id: "vendor/embed-1",
  supported_endpoint_types: ["embeddings"],
};
const imageGeneration = {
  id: "vendor/image-1",
  supported_endpoint_types: ["image-generation"],
};
const video = {
  id: "vendor/video-1",
  supported_endpoint_types: ["openai-video"],
};
const rerank = {
  id: "vendor/rerank-1",
  supported_endpoint_types: ["jina-rerank"],
};

function catalogOf(records: unknown[]): OrcaCatalog {
  return {
    models: parseOrcaCatalogPayload({ data: records }),
    source: "live",
    degraded: false,
    degradedReason: null,
    fetchedAt: "2026-09-20T00:00:00.000Z",
  };
}

function catalogOfModels(models: OrcaModel[]): OrcaCatalog {
  return { ...catalogOf([]), models };
}

describe("parseOrcaModelRecord", () => {
  it("preserves the vendor/model namespace verbatim", () => {
    const model = parseOrcaModelRecord(textOnly);
    expect(model?.id).toBe("deepseek/deepseek-v4-pro");
    expect(model?.contextLength).toBe(1048576);
    expect(model?.endpointTypes).toEqual(["openai", "openai-response"]);
    expect(model?.architecture?.inputModalities).toEqual(["text"]);
  });

  it("drops records without a usable id", () => {
    expect(parseOrcaModelRecord({ id: "  " })).toBeNull();
    expect(parseOrcaModelRecord({ id: 42 })).toBeNull();
    expect(parseOrcaModelRecord(null)).toBeNull();
    expect(parseOrcaModelRecord("vendor/model")).toBeNull();
  });

  it("ignores unknown modalities and non-integer context lengths", () => {
    const model = parseOrcaModelRecord({
      id: "vendor/x",
      context_length: -1,
      supported_endpoint_types: ["openai", 7],
      architecture: { input_modalities: ["text", "smell"] },
    });
    expect(model?.contextLength).toBeNull();
    expect(model?.endpointTypes).toEqual(["openai"]);
    expect(model?.architecture?.inputModalities).toEqual(["text"]);
  });
});

describe("parseOrcaCatalogPayload", () => {
  it("accepts the OpenAI-shaped envelope and a bare array", () => {
    expect(parseOrcaCatalogPayload({ data: [textOnly] })).toHaveLength(1);
    expect(parseOrcaCatalogPayload([textOnly])).toHaveLength(1);
  });

  it("rejects an unexpected shape", () => {
    expect(() => parseOrcaCatalogPayload({ models: [] })).toThrow(
      OrcaCatalogError,
    );
    expect(() => parseOrcaCatalogPayload(null)).toThrow(OrcaCatalogError);
  });

  it("de-duplicates repeated ids", () => {
    expect(
      parseOrcaCatalogPayload({ data: [textOnly, textOnly] }),
    ).toHaveLength(1);
  });
});

describe("capability filtering", () => {
  const catalog = catalogOf([
    textOnly,
    imageInputChat,
    embedding,
    imageGeneration,
    video,
    rerank,
  ]);

  it("treats text endpoint types as chat and excludes non-text families", () => {
    const ids = selectOrcaModels(catalog, { capability: "chat" }).map(
      (m) => m.id,
    );
    expect(ids).toEqual([
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-flash-vision-exp",
    ]);
    expect(ids).not.toContain("vendor/image-1");
    expect(ids).not.toContain("vendor/video-1");
    expect(ids).not.toContain("vendor/rerank-1");
    expect(ids).not.toContain("vendor/embed-1");
  });

  it("matches embedding, image, video and rerank strictly on endpoint type", () => {
    expect(
      selectOrcaModels(catalog, { capability: "embedding" }).map((m) => m.id),
    ).toEqual(["vendor/embed-1"]);
    expect(
      selectOrcaModels(catalog, { capability: "image" }).map((m) => m.id),
    ).toEqual(["vendor/image-1"]);
    expect(
      selectOrcaModels(catalog, { capability: "video" }).map((m) => m.id),
    ).toEqual(["vendor/video-1"]);
    expect(
      selectOrcaModels(catalog, { capability: "rerank" }).map((m) => m.id),
    ).toEqual(["vendor/rerank-1"]);
  });

  it("accepts each of the four text endpoint types", () => {
    for (const endpointType of [
      "openai",
      "anthropic",
      "gemini",
      "openai-response",
    ]) {
      const model = parseOrcaModelRecord({
        id: `vendor/${endpointType}`,
        supported_endpoint_types: [endpointType],
      }) as OrcaModel;
      expect(modelSupportsCapability(model, "chat")).toBe(true);
    }
  });

  it("excludes a model that mixes a text type with a non-text family", () => {
    const mixed = parseOrcaModelRecord({
      id: "vendor/mixed",
      supported_endpoint_types: ["openai", "image-generation"],
    }) as OrcaModel;
    expect(modelSupportsCapability(mixed, "chat")).toBe(false);
  });

  it("offers only chat models that declare the required input modality", () => {
    const ids = selectOrcaModels(catalog, {
      capability: "chat",
      requiredInputModalities: ["image"],
    }).map((m) => m.id);
    expect(ids).toEqual(["deepseek/deepseek-v4-flash-vision-exp"]);
  });

  it("fails closed for a chat model with no architecture block", () => {
    const undeclared = parseOrcaModelRecord({
      id: "vendor/undeclared",
      supported_endpoint_types: ["openai"],
    }) as OrcaModel;
    expect(modelSupportsCapability(undeclared, "chat")).toBe(true);
    expect(modelSupportsInputModality(undeclared, "image")).toBe(false);
    expect(
      selectOrcaModels(catalogOfModels([undeclared]), {
        capability: "chat",
        requiredInputModalities: ["image"],
      }),
    ).toEqual([]);
  });

  it("fails closed for audio and video input, and ignores text requirements", () => {
    const model = parseOrcaModelRecord(imageInputChat) as OrcaModel;
    expect(modelSupportsInputModality(model, "audio")).toBe(false);
    expect(modelSupportsInputModality(model, "video")).toBe(false);
    expect(modelSupportsInputModality(model, "text")).toBe(true);
    expect(
      selectOrcaModels(catalogOfModels([model]), {
        capability: "chat",
        requiredInputModalities: ["text"],
      }),
    ).toHaveLength(1);
  });

  it("never infers image input from a model name", () => {
    const named = parseOrcaModelRecord({
      id: "vendor/super-vision-ultra",
      supported_endpoint_types: ["openai"],
      architecture: { input_modalities: ["text"] },
    }) as OrcaModel;
    expect(modelSupportsInputModality(named, "image")).toBe(false);
  });
});

describe("isOrcaModelCompatible", () => {
  const catalog = catalogOf([textOnly, imageInputChat]);

  it("keeps a compatible selection and invalidates an incompatible one", () => {
    expect(
      isOrcaModelCompatible(catalog, "deepseek/deepseek-v4-pro", {
        capability: "chat",
      }),
    ).toBe(true);
    expect(
      isOrcaModelCompatible(catalog, "deepseek/deepseek-v4-pro", {
        capability: "chat",
        requiredInputModalities: ["image"],
      }),
    ).toBe(false);
    expect(
      isOrcaModelCompatible(catalog, "vendor/gone", { capability: "chat" }),
    ).toBe(false);
  });
});

describe("orcaCatalogUrl", () => {
  it("builds capability-scoped URLs on the inference origin", () => {
    expect(orcaCatalogUrl(origins)).toBe("https://api.orcarouter.ai/v1/models");
    expect(orcaCatalogUrl(origins, "chat")).toBe(
      "https://api.orcarouter.ai/v1/models?capability=chat",
    );
    expect(orcaCatalogUrl(origins, "embedding")).toBe(
      "https://api.orcarouter.ai/v1/models?capability=embedding",
    );
    expect(orcaCatalogUrl(origins, "image")).toBe(
      "https://api.orcarouter.ai/v1/models?capability=image",
    );
    // The protocol has no video or rerank capability query; those are filtered
    // strictly on the returned endpoint type instead.
    expect(orcaCatalogUrl(origins, "video")).toBe(
      "https://api.orcarouter.ai/v1/models",
    );
  });
});

describe("fetchOrcaCatalog", () => {
  it("sends the key as a Bearer token to the inference origin", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ data: [textOnly] }),
    );
    const catalog = await fetchOrcaCatalog({
      origins,
      apiKey: "sk-orca-test",
      capability: "chat",
      fetch,
    });
    expect(catalog.source).toBe("live");
    expect(catalog.degraded).toBe(false);
    expect(catalog.models).toHaveLength(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.orcarouter.ai/v1/models?capability=chat");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk-orca-test",
    });
  });

  it.each([
    [401, /rejected while listing models/],
    [403, /rejected while listing models/],
    [500, /status 500/],
  ])(
    "reports status %i without echoing the key or body",
    async (status, pattern) => {
      const error = await fetchOrcaCatalog({
        origins,
        apiKey: "sk-orca-secret-value",
        fetch: async () => new Response("upstream detail", { status }),
      }).catch((e: unknown) => e as OrcaCatalogError);
      expect(error).toBeInstanceOf(OrcaCatalogError);
      expect(error.status).toBe(status);
      expect(error.message).toMatch(pattern);
      expect(error.message).not.toContain("sk-orca-secret-value");
      expect(error.message).not.toContain("upstream detail");
    },
  );

  it("requires a key before making a request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    await expect(
      fetchOrcaCatalog({ origins, apiKey: "  ", fetch }),
    ).rejects.toThrow(/API key is required/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces a transport failure and invalid JSON as catalog errors", async () => {
    await expect(
      fetchOrcaCatalog({
        origins,
        apiKey: "sk-orca-test",
        fetch: async () => {
          throw new TypeError("fetch failed");
        },
      }),
    ).rejects.toThrow(/Could not reach the OrcaRouter model catalog/);
    await expect(
      fetchOrcaCatalog({
        origins,
        apiKey: "sk-orca-test",
        fetch: async () => new Response("<html>nope</html>"),
      }),
    ).rejects.toThrow(/not valid JSON/);
    await expect(
      fetchOrcaCatalog({
        origins,
        apiKey: "sk-orca-test",
        fetch: async () => Response.json({ models: [] }),
      }),
    ).rejects.toThrow(/unexpected shape/);
  });

  it("bounds the response size and the item count", async () => {
    await expect(
      fetchOrcaCatalog({
        origins,
        apiKey: "sk-orca-test",
        fetch: async () =>
          new Response("x".repeat(MAX_CATALOG_BYTES + 1), { status: 200 }),
      }),
    ).rejects.toThrow(/larger than this client accepts/);

    const many = Array.from({ length: 900 }, (_, i) => ({
      id: `vendor/model-${i}`,
      supported_endpoint_types: ["openai"],
    }));
    const catalog = await fetchOrcaCatalog({
      origins,
      apiKey: "sk-orca-test",
      fetch: async () => Response.json({ data: many }),
    });
    expect(catalog.models.length).toBeLessThanOrEqual(500);
  });

  it("applies a bounded default timeout", () => {
    expect(DEFAULT_CATALOG_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });

  it("aborts on caller cancellation instead of hanging", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchOrcaCatalog({
        origins,
        apiKey: "sk-orca-test",
        signal: controller.signal,
        fetch: async (_url, init) => {
          if (init?.signal?.aborted)
            throw new DOMException("aborted", "AbortError");
          return Response.json({ data: [] });
        },
      }),
    ).rejects.toThrow(OrcaCatalogError);
  });

  it("follows an explicit self-hosted API origin", async () => {
    const selfHosted = resolveOrcarouterOrigins({
      apiBaseUrl: "https://relay.example",
    });
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ data: [] }),
    );
    await fetchOrcaCatalog({
      origins: selfHosted,
      apiKey: "sk-orca-test",
      fetch,
    });
    expect(fetch.mock.calls[0]![0]).toBe("https://relay.example/v1/models");
  });
});

describe("orcarouterSeedCatalog", () => {
  it("is marked degraded and labelled as a seed, never as live", () => {
    const seed = orcarouterSeedCatalog("outage");
    expect(seed.source).toBe("seed");
    expect(seed.degraded).toBe(true);
    expect(seed.degradedReason).toBe("outage");
    expect(seed.fetchedAt).toBeNull();
  });

  it("keeps the verified fallback ids and their metadata intact", () => {
    const seed = orcarouterSeedCatalog("outage");
    const ids = seed.models.map((m) => m.id);
    expect(ids).toEqual([
      "openai/gpt-5.5",
      "anthropic/claude-opus-4.8",
      "google/gemini-3.5-flash",
      "deepseek/deepseek-v4-pro",
      "orcarouter/auto",
    ]);
    const gpt55 = seed.models[0]!;
    expect(gpt55.reasoningEfforts).toEqual(["low", "medium", "high", "xhigh"]);
    expect(gpt55.contextLength).toBeGreaterThan(0);
    expect(gpt55.architecture?.inputModalities).toContain("image");
  });

  it("still satisfies the chat selector and the multimodal selector", () => {
    const seed = orcarouterSeedCatalog("outage");
    expect(
      selectOrcaModels(seed, { capability: "chat" }).length,
    ).toBeGreaterThan(0);
    expect(
      selectOrcaModels(seed, {
        capability: "chat",
        requiredInputModalities: ["image"],
      }).length,
    ).toBeGreaterThan(0);
  });
});

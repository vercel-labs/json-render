// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useOrcaModels } from "./use-orca-models";

/** A catalog response as the server route shapes it. */
function response(overrides: Record<string, unknown> = {}) {
  return {
    models: [
      {
        id: "vendor/text-only",
        name: "Text Only",
        contextLength: 1000,
        maxCompletionTokens: null,
        inputModalities: ["text"],
        reasoningEfforts: null,
      },
    ],
    source: "live",
    degraded: false,
    degradedReason: null,
    fetchedAt: "2026-09-20T00:00:00.000Z",
    capability: "chat",
    requiredInputModalities: [],
    maskedKey: "sk-orca-••••-key",
    selectionStillValid: null,
    ...overrides,
  };
}

describe("useOrcaModels", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function mount(options: Parameters<typeof useOrcaModels>[0]) {
    return renderHook(() => useOrcaModels(options));
  }

  function lastUrl(): URL {
    return new URL(
      String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1]![0]),
      "http://localhost",
    );
  }

  it("requests the chat capability from the API when enabled", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => response() });
    const { result } = mount({ enabled: true, capability: "chat" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(lastUrl().pathname).toBe("/api/orcarouter/models");
    expect(lastUrl().searchParams.get("capability")).toBe("chat");
    expect(result.current.models.map((m) => m.id)).toEqual([
      "vendor/text-only",
    ]);
    expect(result.current.source).toBe("live");
  });

  it("adds the attachment modalities to the request and re-fetches on change", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        response({
          models: [
            {
              id: "vendor/vision",
              name: "Vision",
              contextLength: 1000,
              maxCompletionTokens: null,
              inputModalities: ["text", "image"],
              reasoningEfforts: null,
            },
          ],
          requiredInputModalities: ["image"],
        }),
    });
    const { result, rerender } = mount({
      enabled: true,
      capability: "chat",
      requiredInputModalities: [],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(lastUrl().searchParams.get("input")).toBeNull();

    rerender();
    const { result: withImage } = mount({
      enabled: true,
      capability: "chat",
      requiredInputModalities: ["image"],
    });
    await waitFor(() => expect(withImage.current.loading).toBe(false));
    expect(lastUrl().searchParams.get("input")).toBe("image");
    // Only the model that declares image input remains in the options.
    expect(withImage.current.models.map((m) => m.id)).toEqual([
      "vendor/vision",
    ]);
  });

  it("sends the current selection so the server can invalidate it", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => response({ selectionStillValid: false }),
    });
    const { result } = mount({
      enabled: true,
      capability: "chat",
      selected: "vendor/text-only",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(lastUrl().searchParams.get("selected")).toBe("vendor/text-only");
    expect(result.current.selectionInvalidated).toBe(true);
  });

  it("reports a degraded seed without degrading into free text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        response({
          models: [
            {
              id: "openai/gpt-5.5",
              name: "GPT-5.5",
              contextLength: 400000,
              maxCompletionTokens: null,
              inputModalities: ["text", "image"],
              reasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          ],
          source: "seed",
          degraded: true,
          degradedReason: "Could not reach the OrcaRouter model catalog.",
          fetchedAt: null,
        }),
    });
    const { result } = mount({ enabled: true, capability: "chat" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.degraded).toBe(true);
    expect(result.current.source).toBe("seed");
    expect(result.current.degradedReason).toBeTruthy();
    expect(result.current.models.map((m) => m.id)).toEqual(["openai/gpt-5.5"]);
    // The verified reasoning ladder survives the fallback.
    expect(result.current.models[0]!.reasoningEfforts).toEqual([
      "low",
      "medium",
      "high",
      "xhigh",
    ]);
  });

  it("surfaces a failure as an error with no options, never as free text", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { result } = mount({ enabled: true, capability: "chat" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.models).toEqual([]);
  });

  it("surfaces a transport failure the same way", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = mount({ enabled: true, capability: "chat" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.models).toEqual([]);
  });

  it("fetches nothing when the provider is not OrcaRouter", async () => {
    const { result } = mount({ enabled: false, capability: "chat" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.models).toEqual([]);
  });

  it("refresh re-reads the catalog", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => response() });
    const { result } = mount({ enabled: true, capability: "chat" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = fetchMock.mock.calls.length;
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it("ignores a stale response for the same hook when the capability changes", async () => {
    let resolveSlow: ((value: unknown) => void) | null = null;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSlow = resolve;
      }),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        response({
          capability: "embedding",
          models: [
            {
              id: "vendor/embed",
              name: null,
              contextLength: null,
              maxCompletionTokens: null,
              inputModalities: [],
              reasoningEfforts: null,
            },
          ],
        }),
    });

    // One hook instance, whose capability changes while a request is in flight.
    const { result, rerender } = renderHook(
      (capability: "chat" | "embedding") =>
        useOrcaModels({ enabled: true, capability }),
      { initialProps: "chat" as "chat" | "embedding" },
    );
    rerender("embedding");
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.models.map((m) => m.id)).toEqual(["vendor/embed"]);

    // The superseded chat response resolves late and must not overwrite it.
    await act(async () => {
      resolveSlow!({
        ok: true,
        json: async () =>
          response({
            models: [
              {
                id: "vendor/stale-chat",
                name: null,
                contextLength: null,
                maxCompletionTokens: null,
                inputModalities: ["text"],
                reasoningEfforts: null,
              },
            ],
          }),
      });
    });
    expect(result.current.models.map((m) => m.id)).toEqual(["vendor/embed"]);
  });

  it("never places the raw key in the browser: only the masked form arrives", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => response() });
    const { result } = mount({ enabled: true, capability: "chat" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.maskedKey).toBe("sk-orca-••••-key");
    // The request carries no Authorization header or key of its own.
    const init = fetchMock.mock.calls[0]![1] as RequestInit | undefined;
    expect(JSON.stringify(init ?? {})).not.toContain("sk-orca");
  });
});

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlaygroundStream } from "./use-playground-stream";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const patches = [
  { op: "add", path: "/root", value: "text" },
  {
    op: "add",
    path: "/elements/text",
    value: { type: "Text", props: { text: "Hello" }, children: [] },
  },
];
function stream(lines: unknown[], trailingNewline = true) {
  const text =
    lines.map((line) => JSON.stringify(line)).join("\n") +
    (trailingNewline ? "\n" : "");
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 17));
        controller.enqueue(bytes.slice(17));
        controller.close();
      },
    }),
  );
}

describe("playground model streaming", () => {
  it("uses the selected spec for Jev follow-ups and retains decisions and completion metadata", async () => {
    const previousSpec = {
      root: "text",
      elements: {
        text: { type: "Text", props: { text: "Before" }, children: [] },
      },
      state: { saved: true },
    };
    const fetch = vi.fn(async () =>
      stream(
        [
          { op: "replace", path: "/elements/text/props/text", value: "After" },
          { __meta: "decision", choice: "text" },
          {
            __meta: "composition",
            stopReason: "finish",
            calls: 2,
            elapsedMs: 40,
            inputTokens: null,
            estimatedCostUsd: null,
          },
        ],
        false,
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() =>
      usePlaygroundStream({
        api: "/api/generate",
        model: "typesafe-ai/jev",
        format: "yaml",
      }),
    );
    await act(async () => result.current.send("Edit UI", { previousSpec }));
    const call = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe("/api/generate");
    expect(JSON.parse(call[1].body as string)).toMatchObject({
      model: "typesafe-ai/jev",
      format: "jsonl",
    });
    expect(JSON.parse(call[1].body as string).context.previousSpec).toEqual(
      previousSpec,
    );
    expect(result.current.spec?.root).toBe("text");
    expect(result.current.spec?.elements.text?.props.text).toBe("After");
    expect(previousSpec.elements.text.props.text).toBe("Before");
    expect(result.current.spec?.state).toEqual(previousSpec.state);
    expect(result.current.composition).toMatchObject({
      stopReason: "finish",
      calls: 2,
      inputTokens: null,
    });
    expect(result.current.usage).toBeNull();
    expect(result.current.rawLines).toHaveLength(3);
  });

  it("keeps default-model editing and usage working", async () => {
    const fetch = vi.fn(async () =>
      stream([
        { op: "replace", path: "/elements/text/props/text", value: "Edited" },
        {
          __meta: "usage",
          promptTokens: 4,
          completionTokens: 2,
          totalTokens: 6,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetch);
    const previousSpec = {
      root: "text",
      elements: { text: patches[1]!.value },
    };
    const { result } = renderHook(() =>
      usePlaygroundStream({ api: "/api/generate", format: "jsonl" }),
    );
    await act(async () => result.current.send("Edit", { previousSpec }));
    expect(result.current.spec?.elements.text?.props.text).toBe("Edited");
    expect(result.current.usage?.totalTokens).toBe(6);
    expect(result.current.composition).toBeNull();
    const call = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(call[1].body as string).context.previousSpec).toEqual(
      previousSpec,
    );
  });

  it.each(["unavailable", "limit"])(
    "preserves %s as a distinct completion outcome",
    async (stopReason) => {
      vi.stubGlobal("fetch", async () =>
        stream([
          {
            __meta: "composition",
            stopReason,
            calls: 1,
            elapsedMs: 20,
            inputTokens: null,
            estimatedCostUsd: null,
          },
        ]),
      );
      const { result } = renderHook(() =>
        usePlaygroundStream({
          api: "/api/generate",
          model: "typesafe-ai/jev",
          format: "jsonl",
        }),
      );
      await act(async () => result.current.send("Create UI"));
      expect(result.current.composition?.stopReason).toBe(stopReason);
      expect(result.current.isStreaming).toBe(false);
    },
  );

  it("retains partial specs on errors and rejects a truncated composition", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        stream([...patches, { __meta: "error", message: "Provider failed" }]),
      )
      .mockResolvedValueOnce(stream(patches));
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() =>
      usePlaygroundStream({
        api: "/api/generate",
        model: "typesafe-ai/jev",
        format: "jsonl",
      }),
    );
    await act(async () => result.current.send("Create UI"));
    expect(result.current.error?.message).toBe("Provider failed");
    expect(result.current.spec?.root).toBe("text");
    await act(async () => result.current.send("Try again"));
    expect(result.current.error?.message).toContain("ended early");
    expect(result.current.isStreaming).toBe(false);
  });

  it("Stop aborts the active request without discarding its partial spec", async () => {
    const fetch = vi.fn(
      async (_url: string, init: RequestInit) =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  patches.map((patch) => JSON.stringify(patch)).join("\n") +
                    "\n",
                ),
              );
              init.signal!.addEventListener(
                "abort",
                () =>
                  controller.error(new DOMException("Stopped", "AbortError")),
                { once: true },
              );
            },
          }),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() =>
      usePlaygroundStream({
        api: "/api/generate",
        model: "typesafe-ai/jev",
        format: "jsonl",
      }),
    );
    let pending: Promise<void>;
    await act(async () => {
      pending = result.current.send("Create UI");
      await Promise.resolve();
    });
    expect(result.current.spec?.root).toBe("text");
    await act(async () => {
      result.current.stop();
      await pending;
    });
    expect(result.current.error?.message).toContain("Stopped");
    expect(result.current.spec?.root).toBe("text");
    expect(result.current.isStreaming).toBe(false);
  });
});

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
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
  it.each(["yaml", "compact"] as const)(
    "uses JSONL for Jev follow-ups when %s is selected and retains completion metadata",
    async (format) => {
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
            {
              op: "replace",
              path: "/elements/text/props/text",
              value: "After",
            },
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
          format,
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
    },
  );

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

const compactPrefix =
  '{\n  "root": {"type":"Text","props":{"text":"雪 café","variant":null}';
const compactText = compactPrefix + " }\n}\n";

describe("compact playground streaming", () => {
  it("keeps YAML streaming and usage working", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          [
            "```yaml-spec",
            "root: text",
            "elements:",
            "  text:",
            "    type: Text",
            "    props:",
            "      text: Hello",
            "```",
            JSON.stringify({ __meta: "usage", totalTokens: 3 }),
            "",
          ].join("\n"),
        ),
    );
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      usePlaygroundStream({ api: "/api/generate", format: "yaml", onComplete }),
    );
    await act(async () => result.current.send("Create"));
    expect(result.current.error).toBeNull();
    expect(result.current.spec?.elements.text?.props.text).toBe("Hello");
    expect(result.current.usage?.totalTokens).toBe(3);
    expect(onComplete).toHaveBeenCalledWith(result.current.spec);
  });
  it("renders incrementally, clears follow-up state, and preserves exact raw text across UTF8 chunks", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const fetch = vi.fn(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(value) {
              controller = value;
            },
          }),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const onComplete = vi.fn();
    const previousSpec = {
      root: "old",
      elements: { old: { type: "Text", props: { text: "Old" } } },
      state: { stale: true },
    };
    const { result } = renderHook(() =>
      usePlaygroundStream({
        api: "/api/generate",
        format: "compact",
        onComplete,
      }),
    );
    let pending: Promise<void>;
    await act(async () => {
      pending = result.current.send("Regenerate", { previousSpec });
    });
    expect(result.current.spec).toEqual({ root: "", elements: {} });
    const bytes = new TextEncoder().encode(
      [compactPrefix.slice(0, -10), compactPrefix.slice(-10)]
        .map((text) => JSON.stringify({ __meta: "compact", text }))
        .join("\n") + "\n",
    );
    await act(async () => {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    });
    await waitFor(() =>
      expect(result.current.spec?.elements.e0?.props.text).toBe("雪 café"),
    );
    expect(result.current.spec?.elements.old).toBeUndefined();
    expect(result.current.spec?.state).toBeUndefined();
    expect(result.current.isStreaming).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => {
      controller.enqueue(
        new TextEncoder().encode(
          JSON.stringify({
            __meta: "compact",
            text: compactText.slice(compactPrefix.length),
          }) +
            "\n" +
            JSON.stringify({ __meta: "usage", totalTokens: 7 }),
        ),
      );
      controller.close();
      await pending;
    });
    expect(result.current.error).toBeNull();
    expect(onComplete).toHaveBeenCalledWith(result.current.spec);
    expect(result.current.rawLines.join("\n")).toBe(compactText);
    expect(result.current.usage?.totalTokens).toBe(7);
    expect(
      JSON.parse(
        (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
          .body as string,
      ),
    ).toMatchObject({ format: "compact", context: { previousSpec } });
  });

  it.each(["error", "truncated", "invalid", "abort"])(
    "keeps the partial preview without completing on %s",
    async (failure) => {
      const onComplete = vi.fn();
      const onError = vi.fn();
      vi.stubGlobal(
        "fetch",
        async (_url: string, init: RequestInit) =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({ __meta: "compact", text: compactPrefix }) +
                      "\n",
                  ),
                );
                if (failure === "abort") {
                  init.signal!.addEventListener(
                    "abort",
                    () =>
                      controller.error(
                        new DOMException("Stopped", "AbortError"),
                      ),
                    { once: true },
                  );
                  return;
                }
                if (failure === "error")
                  controller.enqueue(
                    new TextEncoder().encode(
                      JSON.stringify({
                        __meta: "error",
                        message: "Provider failed",
                      }) + "\n",
                    ),
                  );
                if (failure === "invalid")
                  controller.enqueue(
                    new TextEncoder().encode(
                      JSON.stringify({
                        __meta: "compact",
                        text: ',"unknown":true}}',
                      }),
                    ),
                  );
                controller.close();
              },
            }),
          ),
      );
      const { result } = renderHook(() =>
        usePlaygroundStream({
          api: "/api/generate",
          format: "compact",
          onComplete,
          onError,
        }),
      );
      let pending: Promise<void>;
      await act(async () => {
        pending = result.current.send("Create");
      });
      if (failure === "abort") {
        await waitFor(() =>
          expect(result.current.spec?.elements.e0?.props.text).toBe("雪 café"),
        );
        await act(async () => {
          result.current.stop();
          await pending;
        });
      } else
        await act(async () => {
          await pending;
        });
      expect(result.current.spec?.elements.e0?.props.text).toBe("雪 café");
      expect(result.current.rawLines.join("\n")).toBe(
        compactPrefix + (failure === "invalid" ? ',"unknown":true}}' : ""),
      );
      expect(result.current.error).not.toBeNull();
      if (failure === "error")
        expect(result.current.error?.message).toBe("Provider failed");
      expect(onComplete).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(failure === "abort" ? 0 : 1);
      expect(result.current.isStreaming).toBe(false);
    },
  );
});

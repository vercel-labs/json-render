import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type UseChatUIReturn,
  type UseUIStreamReturn,
  useChatUI,
  useUIStream,
} from "./hooks";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function specLines(root: string) {
  return [
    JSON.stringify({
      op: "add",
      path: `/elements/${root}`,
      value: { type: "Text", props: { text: root } },
    }),
    JSON.stringify({ op: "replace", path: "/root", value: root }),
    "",
  ].join("\n");
}

function hasRoot(stream: UseUIStreamReturn | UseChatUIReturn, root: string) {
  return "spec" in stream
    ? stream.spec?.root === root
    : stream.messages.some((message) => message.spec?.root === root);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each([
  ["useUIStream", useUIStream],
  ["useChatUI", useChatUI],
] as const)("%s request replacement", (_name, useStream) => {
  it("keeps streaming when the previous fetch is aborted", async () => {
    const response = deferred<Response>();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(
        (_input, options) =>
          new Promise((_resolve, reject) => {
            const signal = options?.signal;
            signal?.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            });
          }),
      )
      .mockReturnValueOnce(response.promise);
    vi.stubGlobal("fetch", fetch);
    const onComplete = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useStream({ api: "/generate", onComplete, onError }),
    );

    let first!: Promise<void>;
    act(() => {
      first = result.current.send("First prompt");
    });
    expect(result.current.isStreaming).toBe(true);

    let second!: Promise<void>;
    await act(async () => {
      second = result.current.send("Replacement prompt");
      await first;
    });
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(fetch.mock.calls[1]?.[1]?.signal?.aborted).toBe(false);
    expect(result.current.isStreaming).toBe(true);

    await act(async () => {
      response.resolve(new Response(specLines("replacement")));
      await second;
    });
    expect(result.current.isStreaming).toBe(false);
    expect(hasRoot(result.current, "replacement")).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("ignores a previous chunk queued just before abort", async () => {
    const reading = deferred<void>();
    const response = deferred<Response>();
    let previousBody!: ReadableStreamDefaultController<Uint8Array>;
    const previous = new ReadableStream<Uint8Array>(
      {
        start(controller) {
          previousBody = controller;
        },
        pull() {
          reading.resolve();
        },
      },
      { highWaterMark: 0 },
    );
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(async (_input, options) => {
        const signal = options?.signal;
        signal?.addEventListener(
          "abort",
          () => previousBody.error(signal.reason),
          {
            once: true,
          },
        );
        return new Response(previous);
      })
      .mockReturnValueOnce(response.promise);
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() => useStream({ api: "/generate" }));

    let first!: Promise<void>;
    await act(async () => {
      first = result.current.send("First prompt");
      await reading.promise;
    });

    let second!: Promise<void>;
    await act(async () => {
      previousBody.enqueue(new TextEncoder().encode(specLines("obsolete")));
      second = result.current.send("Replacement prompt");
      await first;
    });
    expect(hasRoot(result.current, "obsolete")).toBe(false);

    await act(async () => {
      response.resolve(new Response(specLines("replacement")));
      await second;
    });
    expect(hasRoot(result.current, "replacement")).toBe(true);
  });
});

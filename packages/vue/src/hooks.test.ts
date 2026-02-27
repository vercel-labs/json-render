import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h, ref, type Component } from "vue";
import { mount } from "@vue/test-utils";
import { SPEC_DATA_PART_TYPE } from "@json-render/core";
import { StateProvider, useStateStore } from "./composables/state";
import {
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
  useBoundProp,
  useUIStream,
  useJsonRenderMessage,
  type DataPart,
} from "./hooks";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Mount inside a StateProvider and capture a composable's result. */
function withStateProvider<T>(
  composable: () => T,
  initialState: Record<string, unknown> = {},
): { result: T } {
  let result!: T;
  const Child = defineComponent({
    setup() {
      result = composable();
      return () => h("div");
    },
  });
  mount(StateProvider as Component, {
    props: { initialState } as any,
    slots: { default: () => h(Child) },
  });
  return { result };
}

/** Create a simple ReadableStream from a string (for fetch mocks). */
function makeReadableStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

// ---------------------------------------------------------------------------
// flatToTree
// ---------------------------------------------------------------------------

describe("flatToTree", () => {
  it("converts flat elements into a Spec with root and children", () => {
    const elements = [
      { key: "root", type: "Stack", props: {}, parentKey: undefined },
      {
        key: "child1",
        type: "Text",
        props: { content: "hello" },
        parentKey: "root",
      },
    ];
    const spec = flatToTree(elements as any);
    expect(spec.root).toBe("root");
    expect(spec.elements["root"]?.children).toContain("child1");
    expect(spec.elements["child1"]).toBeDefined();
  });

  it("handles a single root element with no children", () => {
    const elements = [
      { key: "root", type: "Text", props: {}, parentKey: undefined },
    ];
    const spec = flatToTree(elements as any);
    expect(spec.root).toBe("root");
    expect(spec.elements["root"]?.children).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildSpecFromParts
// ---------------------------------------------------------------------------

describe("buildSpecFromParts", () => {
  it("returns null when no spec parts present", () => {
    const parts: DataPart[] = [{ type: "text", text: "hello" }];
    expect(buildSpecFromParts(parts)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(buildSpecFromParts([])).toBeNull();
  });

  it("returns a Spec when a snapshot spec data part is present", () => {
    const part: DataPart = {
      type: SPEC_DATA_PART_TYPE,
      data: {
        type: "flat",
        spec: {
          root: "r",
          elements: { r: { type: "Text", props: { content: "hi" } } },
        },
      },
    };
    const result = buildSpecFromParts([part]);
    expect(result?.root).toBe("r");
    expect(result?.elements["r"]).toBeDefined();
  });

  it("applies patch operations incrementally", () => {
    const parts: DataPart[] = [
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "myRoot" },
        },
      },
    ];
    const result = buildSpecFromParts(parts);
    expect(result?.root).toBe("myRoot");
  });

  it("skips malformed data parts silently", () => {
    const parts: DataPart[] = [
      { type: SPEC_DATA_PART_TYPE, data: { type: "unknown" } },
    ];
    expect(buildSpecFromParts(parts)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getTextFromParts
// ---------------------------------------------------------------------------

describe("getTextFromParts", () => {
  it("concatenates text parts with double newlines", () => {
    const parts: DataPart[] = [
      { type: "text", text: "hello" },
      { type: "text", text: "world" },
    ];
    expect(getTextFromParts(parts)).toBe("hello\n\nworld");
  });

  it("ignores non-text parts", () => {
    const parts: DataPart[] = [
      { type: "other", data: {} },
      { type: "text", text: "hi" },
    ];
    expect(getTextFromParts(parts)).toBe("hi");
  });

  it("returns empty string for empty array", () => {
    expect(getTextFromParts([])).toBe("");
  });

  it("filters out empty/whitespace text parts", () => {
    const parts: DataPart[] = [
      { type: "text", text: "  " },
      { type: "text", text: "real" },
    ];
    expect(getTextFromParts(parts)).toBe("real");
  });
});

// ---------------------------------------------------------------------------
// useBoundProp
// ---------------------------------------------------------------------------

describe("useBoundProp", () => {
  it("returns the prop value and a no-op setter when no binding path", () => {
    const { result } = withStateProvider(() =>
      useBoundProp("hello", undefined),
    );
    const [value, setValue] = result;
    expect(value).toBe("hello");
    expect(() => setValue("new")).not.toThrow();
  });

  it("returns undefined prop value when propValue is undefined", () => {
    const { result } = withStateProvider(() =>
      useBoundProp<string>(undefined, undefined),
    );
    expect(result[0]).toBeUndefined();
  });

  it("setter writes to state at the binding path", () => {
    let storeCtx!: ReturnType<typeof useStateStore>;
    let setter!: (v: string) => void;

    const Child = defineComponent({
      setup() {
        storeCtx = useStateStore();
        const [, s] = useBoundProp<string>("Alice", "/name");
        setter = s;
        return () => h("div");
      },
    });

    mount(StateProvider as Component, {
      props: { initialState: { name: "Alice" } } as any,
      slots: { default: () => h(Child) },
    });

    setter("Bob");
    expect(storeCtx.get("/name")).toBe("Bob");
  });
});

// ---------------------------------------------------------------------------
// useUIStream
// ---------------------------------------------------------------------------

describe("useUIStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("send() sets isStreaming true then false after completion", async () => {
    const patchLine =
      JSON.stringify({ op: "add", path: "/root", value: "myRoot" }) +
      "\n" +
      JSON.stringify({
        op: "add",
        path: "/elements/myRoot",
        value: { type: "Text", props: {} },
      }) +
      "\n";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: makeReadableStream(patchLine),
      }),
    );

    let streamResult!: ReturnType<typeof useUIStream>;
    const Child = defineComponent({
      setup() {
        streamResult = useUIStream({ api: "/api/ui" });
        return () => h("div");
      },
    });
    mount(StateProvider as Component, {
      props: { initialState: {} } as any,
      slots: { default: () => h(Child) },
    });

    expect(streamResult.isStreaming.value).toBe(false);
    const promise = streamResult.send("build me a UI");
    expect(streamResult.isStreaming.value).toBe(true);
    await promise;
    expect(streamResult.isStreaming.value).toBe(false);
    expect(streamResult.spec.value?.root).toBe("myRoot");
  });

  it("error is set when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    let streamResult!: ReturnType<typeof useUIStream>;
    const Child = defineComponent({
      setup() {
        streamResult = useUIStream({ api: "/api/ui" });
        return () => h("div");
      },
    });
    mount(StateProvider as Component, {
      props: { initialState: {} } as any,
      slots: { default: () => h(Child) },
    });

    await streamResult.send("fail");
    expect(streamResult.error.value?.message).toBe("Network error");
  });

  it("clear() resets spec and error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("oops")));

    let streamResult!: ReturnType<typeof useUIStream>;
    const Child = defineComponent({
      setup() {
        streamResult = useUIStream({ api: "/api/ui" });
        return () => h("div");
      },
    });
    mount(StateProvider as Component, {
      props: { initialState: {} } as any,
      slots: { default: () => h(Child) },
    });

    await streamResult.send("fail");
    expect(streamResult.error.value).not.toBeNull();
    streamResult.clear();
    expect(streamResult.error.value).toBeNull();
    expect(streamResult.spec.value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useJsonRenderMessage
// ---------------------------------------------------------------------------

describe("useJsonRenderMessage", () => {
  it("returns null spec and false hasSpec when no spec parts", () => {
    const { spec, hasSpec } = useJsonRenderMessage([
      { type: "text", text: "hi" },
    ]);
    expect(spec.value).toBeNull();
    expect(hasSpec.value).toBe(false);
  });

  it("extracts text from text parts", () => {
    const { text } = useJsonRenderMessage([
      { type: "text", text: "hello" },
      { type: "text", text: "world" },
    ]);
    expect(text.value).toBe("hello\n\nworld");
  });

  it("is reactive when passed a Ref<DataPart[]>", () => {
    const parts = ref<DataPart[]>([]);
    const { text, spec, hasSpec } = useJsonRenderMessage(parts);
    expect(text.value).toBe("");
    expect(spec.value).toBeNull();

    parts.value = [{ type: "text", text: "hello" }];
    expect(text.value).toBe("hello");

    parts.value = [
      ...parts.value,
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: { root: "r", elements: { r: { type: "Text", props: {} } } },
        },
      },
    ];
    expect(spec.value?.root).toBe("r");
    expect(hasSpec.value).toBe(true);
  });
});

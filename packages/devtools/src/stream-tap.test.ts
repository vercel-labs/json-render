import { describe, expect, it } from "vitest";
import type { SpecDataPart } from "@json-render/core";
import { SPEC_DATA_PART_TYPE } from "@json-render/core";
import { createEventStore } from "./event-store";
import {
  extractSpecFromParts,
  recordEvent,
  scanMessageParts,
} from "./stream-tap";

describe("scanMessageParts", () => {
  it("emits stream-patch events for spec data parts", () => {
    const store = createEventStore();
    const seen = new WeakSet<object>();

    const data: SpecDataPart = {
      type: "patch",
      patch: {
        op: "add",
        path: "/elements/x",
        value: { type: "Card", props: {} },
      },
    };
    const parts = [{ type: SPEC_DATA_PART_TYPE, data }];

    scanMessageParts(parts, store, seen);

    const snap = store.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0]?.kind).toBe("stream-patch");
    if (snap[0]?.kind === "stream-patch") {
      expect(snap[0].patch.op).toBe("add");
    }
  });

  it("is idempotent: a part is only recorded once", () => {
    const store = createEventStore();
    const seen = new WeakSet<object>();

    const part = {
      type: SPEC_DATA_PART_TYPE,
      data: {
        type: "patch",
        patch: { op: "add", path: "/state/x", value: 1 },
      } as SpecDataPart,
    };

    scanMessageParts([part], store, seen);
    scanMessageParts([part], store, seen);

    expect(store.size()).toBe(1);
  });

  it("ignores non-spec parts", () => {
    const store = createEventStore();
    const seen = new WeakSet<object>();

    scanMessageParts(
      [
        { type: "text", text: "hello" },
        { type: "tool-foo", data: {} },
      ],
      store,
      seen,
    );

    expect(store.size()).toBe(0);
  });
});

describe("recordEvent", () => {
  it("forwards events into the store", () => {
    const store = createEventStore();
    recordEvent(store, {
      kind: "action-dispatched",
      at: 1,
      id: "a",
      name: "foo",
    });
    expect(store.size()).toBe(1);
  });
});

describe("extractSpecFromParts replay", () => {
  it("returns the same spec when the same parts are replayed twice", () => {
    const patch = (op: Record<string, unknown>) => ({
      type: "data-spec",
      data: { type: "patch", patch: op },
    });
    const parts = [
      patch({ op: "add", path: "/root", value: "main" }),
      patch({ op: "add", path: "/state/posts", value: [] }),
      patch({ op: "add", path: "/state/posts/0", value: { id: "1" } }),
      patch({ op: "add", path: "/state/posts/1", value: { id: "2" } }),
      patch({
        op: "add",
        path: "/elements/main",
        value: { type: "Card", props: {}, children: [] },
      }),
      patch({ op: "add", path: "/elements/main/children/-", value: "child" }),
    ];

    const first = extractSpecFromParts(parts);
    const second = extractSpecFromParts(parts);

    expect(second).toEqual(first);
    expect(second?.state?.posts).toEqual([{ id: "1" }, { id: "2" }]);
    expect(second?.elements.main?.children).toEqual(["child"]);
  });
});

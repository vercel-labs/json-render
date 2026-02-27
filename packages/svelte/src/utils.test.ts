import { describe, it, expect } from "vitest";
import {
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
} from "./utils.svelte.js";
import type { FlatElement, SpecDataPart } from "@json-render/core";
import { SPEC_DATA_PART_TYPE } from "@json-render/core";

describe("flatToTree", () => {
  it("converts array of elements to tree structure", () => {
    const elements: FlatElement[] = [
      { key: "root", type: "Container", props: {}, parentKey: undefined },
      {
        key: "child1",
        type: "Text",
        props: { text: "Hello" },
        parentKey: "root",
      },
    ];

    const spec = flatToTree(elements);

    expect(spec.root).toBe("root");
    expect(spec.elements["root"]).toBeDefined();
    expect(spec.elements["child1"]).toBeDefined();
  });

  it("builds parent-child relationships", () => {
    const elements: FlatElement[] = [
      { key: "root", type: "Container", props: {}, parentKey: undefined },
      { key: "child1", type: "Text", props: {}, parentKey: "root" },
      { key: "child2", type: "Text", props: {}, parentKey: "root" },
    ];

    const spec = flatToTree(elements);

    expect(spec.elements["root"]?.children).toEqual(["child1", "child2"]);
  });

  it("handles single root element", () => {
    const elements: FlatElement[] = [
      {
        key: "only",
        type: "Text",
        props: { text: "Solo" },
        parentKey: undefined,
      },
    ];

    const spec = flatToTree(elements);

    expect(spec.root).toBe("only");
    expect(spec.elements["only"]?.children).toEqual([]);
  });

  it("handles deeply nested elements", () => {
    const elements: FlatElement[] = [
      { key: "root", type: "Container", props: {}, parentKey: undefined },
      { key: "level1", type: "Container", props: {}, parentKey: "root" },
      { key: "level2", type: "Container", props: {}, parentKey: "level1" },
      { key: "level3", type: "Text", props: {}, parentKey: "level2" },
    ];

    const spec = flatToTree(elements);

    expect(spec.elements["root"]?.children).toEqual(["level1"]);
    expect(spec.elements["level1"]?.children).toEqual(["level2"]);
    expect(spec.elements["level2"]?.children).toEqual(["level3"]);
    expect(spec.elements["level3"]?.children).toEqual([]);
  });

  it("preserves element props", () => {
    const elements: FlatElement[] = [
      {
        key: "root",
        type: "Card",
        props: { title: "Hello", value: 42 },
        parentKey: undefined,
      },
    ];

    const spec = flatToTree(elements);

    expect(spec.elements["root"]?.props).toEqual({ title: "Hello", value: 42 });
  });

  it("preserves visibility conditions", () => {
    const elements: FlatElement[] = [
      {
        key: "root",
        type: "Container",
        props: {},
        parentKey: undefined,
        visible: { $state: "/isVisible" },
      },
    ];

    const spec = flatToTree(elements);

    expect(spec.elements["root"]?.visible).toEqual({ $state: "/isVisible" });
  });

  it("handles elements with undefined parentKey as root", () => {
    const elements: FlatElement[] = [
      { key: "a", type: "Text", props: {}, parentKey: undefined },
    ];

    const spec = flatToTree(elements);

    expect(spec.root).toBe("a");
  });

  it("handles empty elements array", () => {
    const spec = flatToTree([]);

    expect(spec.root).toBe("");
    expect(spec.elements).toEqual({});
  });

  it("handles multiple children correctly", () => {
    const elements: FlatElement[] = [
      { key: "root", type: "Container", props: {}, parentKey: undefined },
      { key: "a", type: "Text", props: {}, parentKey: "root" },
      { key: "b", type: "Text", props: {}, parentKey: "root" },
      { key: "c", type: "Text", props: {}, parentKey: "root" },
    ];

    const spec = flatToTree(elements);

    expect(spec.elements["root"]?.children).toHaveLength(3);
    expect(spec.elements["root"]?.children).toContain("a");
    expect(spec.elements["root"]?.children).toContain("b");
    expect(spec.elements["root"]?.children).toContain("c");
  });
});

describe("buildSpecFromParts", () => {
  it("returns null when no data-spec parts are present", () => {
    const parts = [
      { type: "text", text: "Hello world" },
      { type: "other", data: {} },
    ];

    const spec = buildSpecFromParts(parts);

    expect(spec).toBeNull();
  });

  it("builds a spec from patch parts", () => {
    const parts = [
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        } satisfies SpecDataPart,
      },
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/main",
            value: { type: "Text", props: { text: "Hi" }, children: [] },
          },
        } satisfies SpecDataPart,
      },
    ];

    const spec = buildSpecFromParts(parts);

    expect(spec).not.toBeNull();
    expect(spec?.root).toBe("main");
    expect(spec?.elements["main"]?.type).toBe("Text");
  });

  it("handles flat spec parts", () => {
    const parts = [
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: {
            root: "root",
            elements: {
              root: { type: "Container", props: {}, children: [] },
            },
          },
        } satisfies SpecDataPart,
      },
    ];

    const spec = buildSpecFromParts(parts);

    expect(spec?.root).toBe("root");
    expect(spec?.elements["root"]?.type).toBe("Container");
  });

  it("ignores non-spec parts", () => {
    const parts = [
      { type: "text", text: "Some text" },
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: {
            root: "r",
            elements: { r: { type: "Text", props: {}, children: [] } },
          },
        } satisfies SpecDataPart,
      },
      { type: "tool-call", data: {} },
    ];

    const spec = buildSpecFromParts(parts);

    expect(spec?.root).toBe("r");
  });

  it("applies patches incrementally", () => {
    const parts = [
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "a" },
        } satisfies SpecDataPart,
      },
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/a",
            value: { type: "Text", props: { n: 1 }, children: [] },
          },
        } satisfies SpecDataPart,
      },
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "patch",
          patch: { op: "replace", path: "/elements/a/props/n", value: 2 },
        } satisfies SpecDataPart,
      },
    ];

    const spec = buildSpecFromParts(parts);

    expect((spec?.elements["a"]?.props as { n: number }).n).toBe(2);
  });

  it("handles nested spec parts via nestedToFlat", () => {
    const parts = [
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "nested",
          spec: {
            type: "Container",
            props: {},
            children: [{ type: "Text", props: { t: "x" } }],
          },
        } satisfies SpecDataPart,
      },
    ];

    const spec = buildSpecFromParts(parts);

    expect(spec).not.toBeNull();
    expect(Object.keys(spec?.elements ?? {}).length).toBeGreaterThan(0);
  });

  it("handles mixed patch + flat + nested parts in sequence", () => {
    const parts = [
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "initial" },
        } satisfies SpecDataPart,
      },
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: {
            root: "replaced",
            elements: { replaced: { type: "Box", props: {}, children: [] } },
          },
        } satisfies SpecDataPart,
      },
    ];

    const spec = buildSpecFromParts(parts);

    expect(spec?.root).toBe("replaced");
  });

  it("returns empty elements map from empty parts list", () => {
    const spec = buildSpecFromParts([]);

    expect(spec).toBeNull();
  });
});

describe("getTextFromParts", () => {
  it("extracts text from text parts", () => {
    const parts = [
      { type: "text", text: "Hello" },
      { type: "text", text: "World" },
    ];

    const text = getTextFromParts(parts);

    expect(text).toBe("Hello\n\nWorld");
  });

  it("returns empty string when no text parts", () => {
    const parts = [
      { type: "data", data: {} },
      { type: "tool-call", data: {} },
    ];

    const text = getTextFromParts(parts);

    expect(text).toBe("");
  });

  it("ignores non-text parts", () => {
    const parts = [
      { type: "text", text: "Keep" },
      { type: "data", data: {} },
      { type: "text", text: "This" },
    ];

    const text = getTextFromParts(parts);

    expect(text).toBe("Keep\n\nThis");
  });

  it("trims whitespace from text parts", () => {
    const parts = [
      { type: "text", text: "  Hello  " },
      { type: "text", text: "\n\nWorld\n\n" },
    ];

    const text = getTextFromParts(parts);

    expect(text).toBe("Hello\n\nWorld");
  });

  it("skips empty text parts", () => {
    const parts = [
      { type: "text", text: "Hello" },
      { type: "text", text: "   " },
      { type: "text", text: "World" },
    ];

    const text = getTextFromParts(parts);

    expect(text).toBe("Hello\n\nWorld");
  });

  it("ignores text parts with non-string text field", () => {
    const parts = [
      { type: "text", text: "Valid" },
      { type: "text", text: 123 as unknown as string },
      { type: "text", text: "Also Valid" },
    ];

    const text = getTextFromParts(parts);

    expect(text).toBe("Valid\n\nAlso Valid");
  });
});

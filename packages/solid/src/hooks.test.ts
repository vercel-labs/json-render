import { describe, it, expect } from "vitest";
import { flatToTree, buildSpecFromParts, getTextFromParts } from "./hooks";

describe("flatToTree", () => {
  it("converts array of elements to tree structure", () => {
    const elements = [
      { key: "container", type: "stack", props: {}, parentKey: null },
      {
        key: "text1",
        type: "text",
        props: { content: "Hello" },
        parentKey: "container",
      },
      {
        key: "text2",
        type: "text",
        props: { content: "World" },
        parentKey: "container",
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("container");
    expect(Object.keys(tree.elements)).toHaveLength(3);
    expect(tree.elements["container"]).toBeDefined();
    expect(tree.elements["text1"]).toBeDefined();
    expect(tree.elements["text2"]).toBeDefined();
  });

  it("builds parent-child relationships", () => {
    const elements = [
      { key: "root", type: "stack", props: {}, parentKey: null },
      { key: "child1", type: "text", props: {}, parentKey: "root" },
      { key: "child2", type: "text", props: {}, parentKey: "root" },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["root"].children).toHaveLength(2);
    expect(tree.elements["root"].children).toContain("child1");
    expect(tree.elements["root"].children).toContain("child2");
  });

  it("handles single root element", () => {
    const elements = [
      {
        key: "only",
        type: "text",
        props: { content: "Single" },
        parentKey: null,
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("only");
    expect(Object.keys(tree.elements)).toHaveLength(1);
  });

  it("handles deeply nested elements", () => {
    const elements = [
      { key: "level0", type: "stack", props: {}, parentKey: null },
      { key: "level1", type: "stack", props: {}, parentKey: "level0" },
      { key: "level2", type: "stack", props: {}, parentKey: "level1" },
      { key: "level3", type: "text", props: {}, parentKey: "level2" },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("level0");
    expect(tree.elements["level0"].children).toContain("level1");
    expect(tree.elements["level1"].children).toContain("level2");
    expect(tree.elements["level2"].children).toContain("level3");
  });

  it("preserves element props", () => {
    const elements = [
      {
        key: "btn",
        type: "button",
        props: { label: "Click me", variant: "primary" },
        parentKey: null,
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["btn"].props).toEqual({
      label: "Click me",
      variant: "primary",
    });
  });

  it("preserves visibility conditions", () => {
    const elements = [
      {
        key: "conditional",
        type: "text",
        props: {},
        parentKey: null,
        visible: { $state: "/isVisible" },
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["conditional"].visible).toEqual({
      $state: "/isVisible",
    });
  });

  it("handles elements with undefined parentKey as root", () => {
    const elements = [
      { key: "root", type: "stack", props: {} } as {
        key: string;
        type: string;
        props: Record<string, unknown>;
        parentKey?: string | null;
      },
    ];

    const tree = flatToTree(elements);

    // Elements without parentKey should not become root (only null parentKey)
    // This tests the edge case
    expect(tree.elements["root"]).toBeDefined();
  });

  it("handles empty elements array", () => {
    const tree = flatToTree([]);

    expect(tree.root).toBe("");
    expect(Object.keys(tree.elements)).toHaveLength(0);
  });

  it("handles multiple children correctly", () => {
    const elements = [
      { key: "parent", type: "grid", props: {}, parentKey: null },
      { key: "a", type: "card", props: {}, parentKey: "parent" },
      { key: "b", type: "card", props: {}, parentKey: "parent" },
      { key: "c", type: "card", props: {}, parentKey: "parent" },
      { key: "d", type: "card", props: {}, parentKey: "parent" },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["parent"].children).toHaveLength(4);
    expect(tree.elements["parent"].children).toEqual(["a", "b", "c", "d"]);
  });
});

// =============================================================================
// buildSpecFromParts
// =============================================================================

describe("buildSpecFromParts", () => {
  it("returns null when no data-spec parts are present", () => {
    const parts = [
      { type: "text", text: "Hello there" },
      { type: "text", text: "How can I help?" },
    ];
    expect(buildSpecFromParts(parts)).toBeNull();
  });

  it("builds a spec from patch parts", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/main",
            value: { type: "Card", props: { title: "Hello" }, children: [] },
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(spec!.root).toBe("main");
    expect(spec!.elements.main).toEqual({
      type: "Card",
      props: { title: "Hello" },
      children: [],
    });
  });

  it("handles flat spec parts", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "flat",
          spec: {
            root: "card-1",
            elements: {
              "card-1": { type: "Card", props: {}, children: [] },
            },
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(spec!.root).toBe("card-1");
    expect(spec!.elements["card-1"]).toBeDefined();
  });

  it("ignores non-spec parts", () => {
    const parts = [
      { type: "text", text: "Some text" },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        },
      },
      { type: "tool-invocation", data: { toolName: "search" } },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(spec!.root).toBe("main");
  });

  it("applies patches incrementally", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/main",
            value: { type: "Stack", props: {}, children: ["child"] },
          },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/child",
            value: { type: "Text", props: { content: "Hi" }, children: [] },
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(Object.keys(spec!.elements)).toHaveLength(2);
    expect(spec!.elements.child!.props.content).toBe("Hi");
  });

  it("handles nested spec parts via nestedToFlat", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "nested",
          spec: {
            type: "Card",
            props: { title: "Nested" },
            children: [
              { type: "Text", props: { content: "Child" }, children: [] },
            ],
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(spec!.root).toBeTruthy();
    // nestedToFlat generates keys like el-0, el-1
    const elementKeys = Object.keys(spec!.elements);
    expect(elementKeys.length).toBe(2);

    const rootEl = spec!.elements[spec!.root];
    expect(rootEl).toBeDefined();
    expect(rootEl!.type).toBe("Card");
    expect(rootEl!.props.title).toBe("Nested");
    expect(rootEl!.children).toHaveLength(1);

    const childKey = rootEl!.children[0]!;
    const childEl = spec!.elements[childKey];
    expect(childEl).toBeDefined();
    expect(childEl!.type).toBe("Text");
    expect(childEl!.props.content).toBe("Child");
  });

  it("handles mixed patch + flat + nested parts in sequence", () => {
    const parts = [
      // Start with a patch
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/main",
            value: { type: "Stack", props: {}, children: [] },
          },
        },
      },
      // Then a flat spec overwrites everything
      {
        type: "data-spec",
        data: {
          type: "flat",
          spec: {
            root: "card-1",
            elements: {
              "card-1": {
                type: "Card",
                props: { title: "Flat" },
                children: [],
              },
            },
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    // Flat overwrites root and elements
    expect(spec!.root).toBe("card-1");
    expect(spec!.elements["card-1"]).toBeDefined();
    expect(spec!.elements["card-1"]!.type).toBe("Card");
  });

  it("returns empty elements map from empty parts list", () => {
    const spec = buildSpecFromParts([]);
    expect(spec).toBeNull();
  });
});

// =============================================================================
// getTextFromParts
// =============================================================================

describe("getTextFromParts", () => {
  it("extracts text from text parts", () => {
    const parts = [
      { type: "text", text: "Hello" },
      { type: "text", text: "World" },
    ];
    expect(getTextFromParts(parts)).toBe("Hello\n\nWorld");
  });

  it("returns empty string when no text parts", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "x" },
        },
      },
    ];
    expect(getTextFromParts(parts)).toBe("");
  });

  it("ignores non-text parts", () => {
    const parts = [
      { type: "text", text: "Before" },
      { type: "data-spec", data: {} },
      { type: "tool-invocation", data: {} },
      { type: "text", text: "After" },
    ];
    expect(getTextFromParts(parts)).toBe("Before\n\nAfter");
  });

  it("trims whitespace from text parts", () => {
    const parts = [
      { type: "text", text: "  Hello  " },
      { type: "text", text: "  World  " },
    ];
    expect(getTextFromParts(parts)).toBe("Hello\n\nWorld");
  });

  it("skips empty text parts", () => {
    const parts = [
      { type: "text", text: "Hello" },
      { type: "text", text: "   " },
      { type: "text", text: "World" },
    ];
    expect(getTextFromParts(parts)).toBe("Hello\n\nWorld");
  });

  it("ignores text parts with non-string text field", () => {
    const parts = [
      { type: "text", text: "Valid" },
      { type: "text", text: undefined as unknown as string },
      { type: "text", text: 42 as unknown as string },
      { type: "text", text: "Also valid" },
    ];
    expect(getTextFromParts(parts)).toBe("Valid\n\nAlso valid");
  });
});

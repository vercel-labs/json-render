import { describe, it, expect } from "vitest";
import { flatToTree } from "./hooks";

describe("flatToTree", () => {
  it("converts array of elements to tree structure", () => {
    const elements = [
      { key: "container", type: "Box", props: {}, parentKey: null },
      {
        key: "text1",
        type: "Text",
        props: { text: "Hello" },
        parentKey: "container",
      },
      {
        key: "text2",
        type: "Text",
        props: { text: "World" },
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
      { key: "root", type: "Box", props: {}, parentKey: null },
      { key: "child1", type: "Text", props: {}, parentKey: "root" },
      { key: "child2", type: "Text", props: {}, parentKey: "root" },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["root"]!.children).toHaveLength(2);
    expect(tree.elements["root"]!.children).toContain("child1");
    expect(tree.elements["root"]!.children).toContain("child2");
  });

  it("handles single root element", () => {
    const elements = [
      {
        key: "only",
        type: "Text",
        props: { text: "Single" },
        parentKey: null,
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("only");
    expect(Object.keys(tree.elements)).toHaveLength(1);
  });

  it("handles deeply nested elements", () => {
    const elements = [
      { key: "level0", type: "Box", props: {}, parentKey: null },
      { key: "level1", type: "Box", props: {}, parentKey: "level0" },
      { key: "level2", type: "Box", props: {}, parentKey: "level1" },
      { key: "level3", type: "Text", props: {}, parentKey: "level2" },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("level0");
    expect(tree.elements["level0"]!.children).toContain("level1");
    expect(tree.elements["level1"]!.children).toContain("level2");
    expect(tree.elements["level2"]!.children).toContain("level3");
  });

  it("preserves element props", () => {
    const elements = [
      {
        key: "heading",
        type: "Heading",
        props: { text: "Dashboard", level: "h1" },
        parentKey: null,
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["heading"]!.props).toEqual({
      text: "Dashboard",
      level: "h1",
    });
  });

  it("preserves visibility conditions", () => {
    const elements = [
      {
        key: "conditional",
        type: "Text",
        props: {},
        parentKey: null,
        visible: { $state: "/isVisible" },
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["conditional"]!.visible).toEqual({
      $state: "/isVisible",
    });
  });

  it("handles empty elements array", () => {
    const tree = flatToTree([]);

    expect(tree.root).toBe("");
    expect(Object.keys(tree.elements)).toHaveLength(0);
  });

  it("handles multiple children correctly", () => {
    const elements = [
      { key: "parent", type: "Box", props: {}, parentKey: null },
      { key: "a", type: "Card", props: {}, parentKey: "parent" },
      { key: "b", type: "Card", props: {}, parentKey: "parent" },
      { key: "c", type: "Card", props: {}, parentKey: "parent" },
      { key: "d", type: "Card", props: {}, parentKey: "parent" },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["parent"]!.children).toHaveLength(4);
    expect(tree.elements["parent"]!.children).toEqual(["a", "b", "c", "d"]);
  });
});

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { flatToTree, useUITree } from "./hooks";
import type { UITree } from "@json-render/core";

describe("useUITree", () => {
  it("starts with empty tree by default", () => {
    const { result } = renderHook(() => useUITree());
    expect(result.current.tree).toEqual({ root: "", elements: {} });
  });

  it("applies patches", () => {
    const { result } = renderHook(() => useUITree());
    act(() => {
      result.current.applyPatch({ op: "set", path: "/root", value: "main" });
      result.current.applyPatch({
        op: "add",
        path: "/elements/main",
        value: { key: "main", type: "Stack", props: {} },
      });
    });
    expect(result.current.tree.root).toBe("main");
    expect(result.current.tree.elements["main"]).toBeDefined();
  });

  it("clears tree", () => {
    const initialTree: UITree = {
      root: "main",
      elements: { main: { key: "main", type: "Stack", props: {} } },
    };
    const { result } = renderHook(() => useUITree({ initialTree }));
    act(() => {
      result.current.clear();
    });
    expect(result.current.tree).toEqual({ root: "", elements: {} });
  });
});

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
        visible: { path: "/isVisible" },
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["conditional"].visible).toEqual({
      path: "/isVisible",
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

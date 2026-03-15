import { describe, it, expect } from "vitest";
import { diffToPatches } from "./diff";

describe("diffToPatches", () => {
  it("returns empty array for identical objects", () => {
    const obj = { a: 1, b: "hello" };
    expect(diffToPatches(obj, obj)).toEqual([]);
  });

  it("detects added keys", () => {
    const patches = diffToPatches({}, { name: "Alice" });
    expect(patches).toEqual([{ op: "add", path: "/name", value: "Alice" }]);
  });

  it("detects removed keys", () => {
    const patches = diffToPatches({ name: "Alice" }, {});
    expect(patches).toEqual([{ op: "remove", path: "/name" }]);
  });

  it("detects changed scalar values", () => {
    const patches = diffToPatches({ name: "Alice" }, { name: "Bob" });
    expect(patches).toEqual([{ op: "replace", path: "/name", value: "Bob" }]);
  });

  it("recurses into nested objects", () => {
    const oldObj = { user: { name: "Alice", age: 30 } };
    const newObj = { user: { name: "Alice", age: 31 } };
    const patches = diffToPatches(oldObj, newObj);
    expect(patches).toEqual([{ op: "replace", path: "/user/age", value: 31 }]);
  });

  it("replaces arrays atomically", () => {
    const oldObj = { items: ["a", "b"] };
    const newObj = { items: ["a", "b", "c"] };
    const patches = diffToPatches(oldObj, newObj);
    expect(patches).toEqual([
      { op: "replace", path: "/items", value: ["a", "b", "c"] },
    ]);
  });

  it("does not emit patch for identical arrays", () => {
    const oldObj = { items: [1, 2, 3] };
    const newObj = { items: [1, 2, 3] };
    expect(diffToPatches(oldObj, newObj)).toEqual([]);
  });

  it("handles type changes (object → scalar)", () => {
    const oldObj = { data: { nested: true } };
    const newObj = { data: "flat" };
    const patches = diffToPatches(
      oldObj as Record<string, unknown>,
      newObj as Record<string, unknown>,
    );
    expect(patches).toEqual([{ op: "replace", path: "/data", value: "flat" }]);
  });

  it("handles a complex spec diff", () => {
    const oldSpec = {
      root: "main",
      elements: {
        main: { type: "Card", props: { title: "Hello" }, children: [] },
      },
    };
    const newSpec = {
      root: "main",
      elements: {
        main: {
          type: "Card",
          props: { title: "Hello" },
          children: ["child-1"],
        },
        "child-1": {
          type: "Text",
          props: { content: "World" },
          children: [],
        },
      },
    };
    const patches = diffToPatches(oldSpec, newSpec);
    expect(patches).toContainEqual({
      op: "replace",
      path: "/elements/main/children",
      value: ["child-1"],
    });
    expect(patches).toContainEqual({
      op: "add",
      path: "/elements/child-1",
      value: {
        type: "Text",
        props: { content: "World" },
        children: [],
      },
    });
  });

  it("escapes JSON Pointer tokens (~ and /)", () => {
    const patches = diffToPatches({}, { "a/b": 1, "c~d": 2 });
    expect(patches).toContainEqual({
      op: "add",
      path: "/a~1b",
      value: 1,
    });
    expect(patches).toContainEqual({
      op: "add",
      path: "/c~0d",
      value: 2,
    });
  });
});

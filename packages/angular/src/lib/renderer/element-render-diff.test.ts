import { describe, expect, it } from "vitest";

import {
  bindingsEqual,
  childrenKey,
  shallowEqualProps,
  stableItemKey,
} from "./element-render-diff";

describe("shallowEqualProps", () => {
  it("is true for identical shallow props", () => {
    expect(shallowEqualProps({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
  });
  it("is false when a value differs or keys differ", () => {
    expect(shallowEqualProps({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqualProps({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});

describe("bindingsEqual", () => {
  it("treats two undefined as equal and one-sided as unequal", () => {
    expect(bindingsEqual(undefined, undefined)).toBe(true);
    expect(bindingsEqual({ value: "/x" }, undefined)).toBe(false);
  });
  it("compares entries shallowly", () => {
    expect(bindingsEqual({ value: "/x" }, { value: "/x" })).toBe(true);
    expect(bindingsEqual({ value: "/x" }, { value: "/y" })).toBe(false);
  });
});

describe("childrenKey", () => {
  it("joins keys and distinguishes order", () => {
    expect(childrenKey(["a", "b"])).not.toBe(childrenKey(["b", "a"]));
    expect(childrenKey(undefined)).toBe("");
  });
});

describe("stableItemKey", () => {
  it("uses the key field when present, else the index", () => {
    expect(stableItemKey({ id: "7" }, 0, "id")).toBe("k:7");
    expect(stableItemKey({ id: "7" }, 3)).toBe("i:3");
    expect(stableItemKey("scalar", 2, "id")).toBe("i:2");
  });
});

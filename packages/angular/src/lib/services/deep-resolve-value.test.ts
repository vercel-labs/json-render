import { describe, expect, it } from "vitest";

import { deepResolveValue, generateUniqueId } from "./deep-resolve-value";

describe("deepResolveValue", () => {
  const get = (path: string): unknown =>
    ({ "/name": "Ada", "/nested": { a: 1 } })[path];

  it("resolves { $state } references", () => {
    expect(deepResolveValue({ $state: "/name" }, get)).toBe("Ada");
  });

  it("resolves nested $state inside objects and arrays", () => {
    const result = deepResolveValue(
      { a: { $state: "/name" }, list: [{ $state: "/name" }, "x"] },
      get,
    );
    expect(result).toEqual({ a: "Ada", list: ["Ada", "x"] });
  });

  it("generates a fresh id for '$id' and { $id }", () => {
    expect(typeof deepResolveValue("$id", get)).toBe("string");
    expect(typeof deepResolveValue({ $id: true }, get)).toBe("string");
  });

  it("passes through primitives untouched", () => {
    expect(deepResolveValue(42, get)).toBe(42);
    expect(deepResolveValue(null, get)).toBeNull();
  });
});

describe("generateUniqueId", () => {
  it("produces distinct ids", () => {
    expect(generateUniqueId()).not.toBe(generateUniqueId());
  });
});

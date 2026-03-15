import { describe, it, expect } from "vitest";
import { deepMergeSpec } from "./merge";

describe("deepMergeSpec", () => {
  it("adds new keys", () => {
    const result = deepMergeSpec({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("replaces scalar values", () => {
    const result = deepMergeSpec({ a: 1 }, { a: 2 });
    expect(result).toEqual({ a: 2 });
  });

  it("deletes keys set to null", () => {
    const result = deepMergeSpec({ a: 1, b: 2 }, { b: null });
    expect(result).toEqual({ a: 1 });
  });

  it("deep-merges nested objects", () => {
    const base = { user: { name: "Alice", age: 30 } };
    const patch = { user: { age: 31 } };
    const result = deepMergeSpec(base, patch);
    expect(result).toEqual({ user: { name: "Alice", age: 31 } });
  });

  it("replaces arrays (does not concat)", () => {
    const base = { items: [1, 2, 3] };
    const patch = { items: [4, 5] };
    const result = deepMergeSpec(base, patch);
    expect(result).toEqual({ items: [4, 5] });
  });

  it("does not mutate base or patch", () => {
    const base = { a: { b: 1 } };
    const patch = { a: { c: 2 } };
    const baseCopy = JSON.parse(JSON.stringify(base));
    const patchCopy = JSON.parse(JSON.stringify(patch));
    deepMergeSpec(base, patch);
    expect(base).toEqual(baseCopy);
    expect(patch).toEqual(patchCopy);
  });

  it("handles a spec-like edit merge", () => {
    const base = {
      root: "main",
      elements: {
        main: {
          type: "Card",
          props: { title: "Dashboard" },
          children: ["metric-1"],
        },
        "metric-1": {
          type: "Metric",
          props: { label: "Revenue", value: "$1M" },
          children: [],
        },
      },
    };
    const patch = {
      elements: {
        main: {
          props: { title: "Updated Dashboard" },
          children: ["metric-1", "chart-1"],
        },
        "chart-1": {
          type: "Chart",
          props: { data: "revenue" },
          children: [],
        },
      },
    };
    const result = deepMergeSpec(base, patch);
    expect(result.root).toBe("main");
    expect(
      (result.elements as Record<string, Record<string, unknown>>)["main"],
    ).toEqual({
      type: "Card",
      props: { title: "Updated Dashboard" },
      children: ["metric-1", "chart-1"],
    });
    expect(
      (result.elements as Record<string, Record<string, unknown>>)["metric-1"],
    ).toEqual({
      type: "Metric",
      props: { label: "Revenue", value: "$1M" },
      children: [],
    });
    expect(
      (result.elements as Record<string, Record<string, unknown>>)["chart-1"],
    ).toEqual({
      type: "Chart",
      props: { data: "revenue" },
      children: [],
    });
  });

  it("deletes an element via null", () => {
    const base = {
      elements: {
        main: { type: "Card" },
        old: { type: "Widget" },
      },
    };
    const patch = { elements: { old: null } };
    const result = deepMergeSpec(base, patch);
    expect(result.elements).toEqual({ main: { type: "Card" } });
  });
});

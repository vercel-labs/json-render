import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  defineDirective,
  createDirectiveRegistry,
  findDirective,
} from "./directives";
import { resolvePropValue } from "./props";
import { evaluateVisibility } from "./visibility";
import type { PropResolutionContext } from "./props";

describe("defineDirective", () => {
  it("returns the definition unchanged", () => {
    const def = defineDirective({
      name: "$double",
      schema: z.object({ $double: z.number() }),
      resolve: (v) => (v as { $double: number }).$double * 2,
    });
    expect(def.name).toBe("$double");
    expect(typeof def.resolve).toBe("function");
  });

  it("throws when name does not start with $", () => {
    expect(() =>
      defineDirective({
        name: "double",
        schema: z.object({ double: z.number() }),
        resolve: () => 0,
      }),
    ).toThrow('Directive name must start with "$"');
  });

  it("throws when name conflicts with a built-in key", () => {
    for (const name of [
      "$state",
      "$item",
      "$index",
      "$bindState",
      "$bindItem",
      "$cond",
      "$computed",
      "$template",
    ]) {
      expect(() =>
        defineDirective({
          name,
          schema: z.object({}),
          resolve: () => 0,
        }),
      ).toThrow(`conflicts with a built-in`);
    }
  });
});

describe("createDirectiveRegistry", () => {
  it("creates a Map from an array of definitions", () => {
    const d1 = defineDirective({
      name: "$a",
      schema: z.object({ $a: z.string() }),
      resolve: () => "a",
    });
    const d2 = defineDirective({
      name: "$b",
      schema: z.object({ $b: z.string() }),
      resolve: () => "b",
    });
    const reg = createDirectiveRegistry([d1, d2]);
    expect(reg.size).toBe(2);
    expect(reg.get("$a")).toBe(d1);
    expect(reg.get("$b")).toBe(d2);
  });

  it("returns an empty Map for an empty array", () => {
    const reg = createDirectiveRegistry([]);
    expect(reg.size).toBe(0);
  });
});

describe("findDirective", () => {
  const d = defineDirective({
    name: "$upper",
    schema: z.object({ $upper: z.string() }),
    resolve: (v) => String((v as { $upper: string }).$upper).toUpperCase(),
  });
  const registry = createDirectiveRegistry([d]);

  it("finds a matching directive", () => {
    expect(findDirective({ $upper: "hello" }, registry)).toBe(d);
  });

  it("returns undefined for non-matching objects", () => {
    expect(findDirective({ foo: "bar" }, registry)).toBeUndefined();
  });

  it("returns undefined when registry is undefined", () => {
    expect(findDirective({ $upper: "hello" }, undefined)).toBeUndefined();
  });

  it("returns undefined for empty registry", () => {
    expect(findDirective({ $upper: "hello" }, new Map())).toBeUndefined();
  });

  it("ignores $ keys not in registry", () => {
    expect(findDirective({ $unknown: 1 }, registry)).toBeUndefined();
  });

  it("throws when multiple directive keys match", () => {
    const d2 = defineDirective({
      name: "$lower",
      schema: z.object({ $lower: z.string() }),
      resolve: (v) => String((v as { $lower: string }).$lower).toLowerCase(),
    });
    const multiRegistry = createDirectiveRegistry([d, d2]);
    expect(() =>
      findDirective({ $upper: "hello", $lower: "WORLD" }, multiRegistry),
    ).toThrow("Ambiguous directive");
  });
});

describe("resolvePropValue with custom directives", () => {
  const doubleDirective = defineDirective({
    name: "$double",
    schema: z.object({ $double: z.unknown() }),
    resolve(value, ctx) {
      const resolved = resolvePropValue(
        (value as { $double: unknown }).$double,
        ctx,
      );
      return (resolved as number) * 2;
    },
  });

  const upperDirective = defineDirective({
    name: "$upper",
    schema: z.object({ $upper: z.unknown() }),
    resolve(value, ctx) {
      const resolved = resolvePropValue(
        (value as { $upper: unknown }).$upper,
        ctx,
      );
      return String(resolved).toUpperCase();
    },
  });

  const registry = createDirectiveRegistry([doubleDirective, upperDirective]);

  it("resolves a custom directive", () => {
    const ctx: PropResolutionContext = { stateModel: {}, directives: registry };
    expect(resolvePropValue({ $double: 5 }, ctx)).toBe(10);
  });

  it("resolves a directive with $state sub-value", () => {
    const ctx: PropResolutionContext = {
      stateModel: { count: 7 },
      directives: registry,
    };
    expect(resolvePropValue({ $double: { $state: "/count" } }, ctx)).toBe(14);
  });

  it("resolves nested directives (composition)", () => {
    const ctx: PropResolutionContext = {
      stateModel: { val: 3 },
      directives: registry,
    };
    const value = { $double: { $double: { $state: "/val" } } };
    expect(resolvePropValue(value, ctx)).toBe(12);
  });

  it("resolves directives inside object props", () => {
    const ctx: PropResolutionContext = {
      stateModel: { name: "alice" },
      directives: registry,
    };
    const value = { label: { $upper: { $state: "/name" } }, count: 1 };
    expect(resolvePropValue(value, ctx)).toEqual({
      label: "ALICE",
      count: 1,
    });
  });

  it("resolves directives inside arrays", () => {
    const ctx: PropResolutionContext = {
      stateModel: { x: 5 },
      directives: registry,
    };
    const value = [{ $double: { $state: "/x" } }, "literal"];
    expect(resolvePropValue(value, ctx)).toEqual([10, "literal"]);
  });

  it("falls through to plain object resolution when no directive matches", () => {
    const ctx: PropResolutionContext = {
      stateModel: { a: 1 },
      directives: registry,
    };
    expect(resolvePropValue({ foo: { $state: "/a" } }, ctx)).toEqual({
      foo: 1,
    });
  });

  it("cannot register a directive that shadows a built-in key", () => {
    expect(() =>
      defineDirective({
        name: "$state",
        schema: z.object({ $state: z.string() }),
        resolve: () => "should-not-reach",
      }),
    ).toThrow("conflicts with a built-in");
  });

  it("works without directives in context (backward compat)", () => {
    const ctx: PropResolutionContext = { stateModel: { x: 1 } };
    expect(resolvePropValue({ $state: "/x" }, ctx)).toBe(1);
    expect(resolvePropValue({ foo: "bar" }, ctx)).toEqual({ foo: "bar" });
  });
});

describe("custom directives in visibility conditions", () => {
  const countDirective = defineDirective({
    name: "$count",
    schema: z.object({ $count: z.unknown() }),
    resolve(value, ctx) {
      const resolved = resolvePropValue(
        (value as { $count: unknown }).$count,
        ctx,
      );
      return Array.isArray(resolved) ? resolved.length : 0;
    },
  });
  const registry = createDirectiveRegistry([countDirective]);
  const stateModel = { cart: { items: ["a", "b"] }, limit: 2, min: 3 };

  it("resolves a directive on the right-hand side of a comparison", () => {
    const ctx: PropResolutionContext = { stateModel, directives: registry };
    expect(
      evaluateVisibility(
        { $state: "/limit", eq: { $count: { $state: "/cart/items" } } },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateVisibility(
        { $state: "/min", lte: { $count: { $state: "/cart/items" } } },
        ctx,
      ),
    ).toBe(false);
  });

  it("resolves a directive inside $cond in props", () => {
    const ctx: PropResolutionContext = { stateModel, directives: registry };
    expect(
      resolvePropValue(
        {
          $cond: {
            $state: "/limit",
            gte: { $count: { $state: "/cart/items" } },
          },
          $then: "full",
          $else: "room",
        },
        ctx,
      ),
    ).toBe("full");
  });

  it("compares the raw object when no registry is present", () => {
    expect(
      evaluateVisibility(
        { $state: "/limit", eq: { $count: { $state: "/cart/items" } } },
        { stateModel },
      ),
    ).toBe(false);
  });
});

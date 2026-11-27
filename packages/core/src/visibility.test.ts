import { describe, it, expect } from "vitest";
import {
  evaluateVisibility,
  splitRepeatVisibility,
  visibility,
} from "./visibility";

describe("evaluateVisibility", () => {
  describe("undefined / boolean", () => {
    it("returns true for undefined", () => {
      expect(evaluateVisibility(undefined, { stateModel: {} })).toBe(true);
    });

    it("returns true for true", () => {
      expect(evaluateVisibility(true, { stateModel: {} })).toBe(true);
    });

    it("returns false for false", () => {
      expect(evaluateVisibility(false, { stateModel: {} })).toBe(false);
    });
  });

  describe("truthiness ($state only)", () => {
    it("returns true when state path is truthy (boolean)", () => {
      expect(
        evaluateVisibility(
          { $state: "/isAdmin" },
          { stateModel: { isAdmin: true } },
        ),
      ).toBe(true);
    });

    it("returns true when state path is truthy (number)", () => {
      expect(
        evaluateVisibility({ $state: "/count" }, { stateModel: { count: 5 } }),
      ).toBe(true);
    });

    it("returns true when state path is truthy (string)", () => {
      expect(
        evaluateVisibility(
          { $state: "/name" },
          { stateModel: { name: "Alice" } },
        ),
      ).toBe(true);
    });

    it("returns false when state path is falsy (boolean)", () => {
      expect(
        evaluateVisibility(
          { $state: "/isAdmin" },
          { stateModel: { isAdmin: false } },
        ),
      ).toBe(false);
    });

    it("returns false when state path is falsy (zero)", () => {
      expect(
        evaluateVisibility({ $state: "/count" }, { stateModel: { count: 0 } }),
      ).toBe(false);
    });

    it("returns false when state path is falsy (empty string)", () => {
      expect(
        evaluateVisibility({ $state: "/name" }, { stateModel: { name: "" } }),
      ).toBe(false);
    });

    it("returns false when state path is undefined", () => {
      expect(
        evaluateVisibility({ $state: "/nothing" }, { stateModel: {} }),
      ).toBe(false);
    });

    it("returns false for missing path", () => {
      expect(
        evaluateVisibility(
          { $state: "/nonexistent" },
          { stateModel: { other: true } },
        ),
      ).toBe(false);
    });
  });

  describe("negation ($state + not)", () => {
    it("returns false when state path is truthy", () => {
      expect(
        evaluateVisibility(
          { $state: "/visible", not: true },
          { stateModel: { visible: true } },
        ),
      ).toBe(false);
    });

    it("returns true when state path is falsy", () => {
      expect(
        evaluateVisibility(
          { $state: "/visible", not: true },
          { stateModel: { visible: false } },
        ),
      ).toBe(true);
    });

    it("not inverts an eq condition", () => {
      expect(
        evaluateVisibility(
          { $state: "/tab", eq: "home", not: true },
          { stateModel: { tab: "home" } },
        ),
      ).toBe(false);
      expect(
        evaluateVisibility(
          { $state: "/tab", eq: "home", not: true },
          { stateModel: { tab: "settings" } },
        ),
      ).toBe(true);
    });

    it("not inverts a gt condition", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 5, not: true },
          { stateModel: { count: 10 } },
        ),
      ).toBe(false);
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 5, not: true },
          { stateModel: { count: 3 } },
        ),
      ).toBe(true);
    });
  });

  describe("equality ($state + eq)", () => {
    it("returns true when values match (number)", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", eq: 5 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(true);
    });

    it("returns false when values do not match", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", eq: 10 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(false);
    });

    it("returns true when values match (string)", () => {
      expect(
        evaluateVisibility(
          { $state: "/tab", eq: "home" },
          { stateModel: { tab: "home" } },
        ),
      ).toBe(true);
    });

    it("supports state-to-state comparison", () => {
      expect(
        evaluateVisibility(
          { $state: "/a", eq: { $state: "/b" } },
          { stateModel: { a: 42, b: 42 } },
        ),
      ).toBe(true);
    });

    it("state-to-state comparison fails when different", () => {
      expect(
        evaluateVisibility(
          { $state: "/a", eq: { $state: "/b" } },
          { stateModel: { a: 1, b: 2 } },
        ),
      ).toBe(false);
    });
  });

  describe("inequality ($state + neq)", () => {
    it("returns true when values differ", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", neq: 10 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(true);
    });

    it("returns false when values are equal", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", neq: 5 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(false);
    });
  });

  describe("numeric comparisons", () => {
    it("gt: returns true when greater", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 3 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(true);
    });

    it("gt: returns false when less", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 3 },
          { stateModel: { count: 2 } },
        ),
      ).toBe(false);
    });

    it("gt: returns false when equal", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 5 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(false);
    });

    it("gte: returns true when equal", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gte: 5 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(true);
    });

    it("gte: returns true when greater", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gte: 5 },
          { stateModel: { count: 6 } },
        ),
      ).toBe(true);
    });

    it("gte: returns false when less", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gte: 5 },
          { stateModel: { count: 4 } },
        ),
      ).toBe(false);
    });

    it("lt: returns true when less", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", lt: 5 },
          { stateModel: { count: 3 } },
        ),
      ).toBe(true);
    });

    it("lt: returns false when greater", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", lt: 5 },
          { stateModel: { count: 7 } },
        ),
      ).toBe(false);
    });

    it("lt: returns false when equal", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", lt: 5 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(false);
    });

    it("lte: returns true when equal", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", lte: 5 },
          { stateModel: { count: 5 } },
        ),
      ).toBe(true);
    });

    it("lte: returns true when less", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", lte: 5 },
          { stateModel: { count: 4 } },
        ),
      ).toBe(true);
    });

    it("lte: returns false when greater", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", lte: 5 },
          { stateModel: { count: 6 } },
        ),
      ).toBe(false);
    });

    it("returns false for non-numeric values", () => {
      expect(
        evaluateVisibility(
          { $state: "/name", gt: 5 },
          { stateModel: { name: "Alice" } },
        ),
      ).toBe(false);
    });

    it("compares numeric strings with numbers", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 3 },
          { stateModel: { count: "5" } },
        ),
      ).toBe(true);
      expect(
        evaluateVisibility(
          { $state: "/count", gte: 5 },
          { stateModel: { count: "5" } },
        ),
      ).toBe(true);
      expect(
        evaluateVisibility(
          { $state: "/count", lt: 5 },
          { stateModel: { count: "3" } },
        ),
      ).toBe(true);
      expect(
        evaluateVisibility(
          { $state: "/count", lte: 5 },
          { stateModel: { count: "5" } },
        ),
      ).toBe(true);
    });

    it("compares two numeric strings", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gt: { $state: "/limit" } },
          { stateModel: { count: "10", limit: "3" } },
        ),
      ).toBe(true);
    });

    it("still returns false for empty and non-numeric strings", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 0 },
          { stateModel: { count: "" } },
        ),
      ).toBe(false);
      expect(
        evaluateVisibility(
          { $state: "/count", gt: 0 },
          { stateModel: { count: "10px" } },
        ),
      ).toBe(false);
    });
  });

  describe("dynamic path references in comparison", () => {
    it("eq with $state reference on right", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", eq: { $state: "/limit" } },
          { stateModel: { count: 5, limit: 5 } },
        ),
      ).toBe(true);
    });

    it("lt with $state reference on right", () => {
      expect(
        evaluateVisibility(
          { $state: "/count", lt: { $state: "/limit" } },
          { stateModel: { count: 3, limit: 5 } },
        ),
      ).toBe(true);
    });
  });

  describe("array (implicit AND)", () => {
    it("returns true when all conditions are true", () => {
      expect(
        evaluateVisibility(
          [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
          { stateModel: { isAdmin: true, tab: "settings" } },
        ),
      ).toBe(true);
    });

    it("returns false when one condition is false", () => {
      expect(
        evaluateVisibility(
          [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
          { stateModel: { isAdmin: false, tab: "settings" } },
        ),
      ).toBe(false);
    });

    it("returns false when all conditions are false", () => {
      expect(
        evaluateVisibility(
          [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
          { stateModel: { isAdmin: false, tab: "home" } },
        ),
      ).toBe(false);
    });
  });

  describe("$and condition (explicit AND)", () => {
    it("returns true when all children are true", () => {
      expect(
        evaluateVisibility(
          {
            $and: [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
          },
          { stateModel: { isAdmin: true, tab: "settings" } },
        ),
      ).toBe(true);
    });

    it("returns false when one child is false", () => {
      expect(
        evaluateVisibility(
          {
            $and: [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
          },
          { stateModel: { isAdmin: false, tab: "settings" } },
        ),
      ).toBe(false);
    });

    it("returns false when all children are false", () => {
      expect(
        evaluateVisibility(
          {
            $and: [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
          },
          { stateModel: { isAdmin: false, tab: "home" } },
        ),
      ).toBe(false);
    });

    it("supports nested $or inside $and", () => {
      // AND( OR(isAdmin, isModerator), tab=settings )
      expect(
        evaluateVisibility(
          {
            $and: [
              { $or: [{ $state: "/isAdmin" }, { $state: "/isModerator" }] },
              { $state: "/tab", eq: "settings" },
            ],
          },
          {
            stateModel: {
              isAdmin: false,
              isModerator: true,
              tab: "settings",
            },
          },
        ),
      ).toBe(true);
      expect(
        evaluateVisibility(
          {
            $and: [
              { $or: [{ $state: "/isAdmin" }, { $state: "/isModerator" }] },
              { $state: "/tab", eq: "settings" },
            ],
          },
          {
            stateModel: {
              isAdmin: false,
              isModerator: false,
              tab: "settings",
            },
          },
        ),
      ).toBe(false);
    });

    it("supports booleans inside $and", () => {
      expect(
        evaluateVisibility(
          { $and: [true, { $state: "/ok" }] },
          { stateModel: { ok: true } },
        ),
      ).toBe(true);
      expect(
        evaluateVisibility(
          { $and: [false, { $state: "/ok" }] },
          { stateModel: { ok: true } },
        ),
      ).toBe(false);
    });
  });

  describe("$or condition", () => {
    it("returns true when at least one child is true", () => {
      expect(
        evaluateVisibility(
          { $or: [{ $state: "/isAdmin" }, { $state: "/isModerator" }] },
          { stateModel: { isAdmin: false, isModerator: true } },
        ),
      ).toBe(true);
    });

    it("returns true when all children are true", () => {
      expect(
        evaluateVisibility(
          { $or: [{ $state: "/isAdmin" }, { $state: "/isModerator" }] },
          { stateModel: { isAdmin: true, isModerator: true } },
        ),
      ).toBe(true);
    });

    it("returns false when all children are false", () => {
      expect(
        evaluateVisibility(
          { $or: [{ $state: "/isAdmin" }, { $state: "/isModerator" }] },
          { stateModel: { isAdmin: false, isModerator: false } },
        ),
      ).toBe(false);
    });

    it("supports nested arrays (AND inside OR)", () => {
      // OR( AND(isAdmin, tab=settings), isSuperUser )
      expect(
        evaluateVisibility(
          {
            $or: [
              [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
              { $state: "/isSuperUser" },
            ],
          },
          {
            stateModel: { isAdmin: true, tab: "settings", isSuperUser: false },
          },
        ),
      ).toBe(true);
      expect(
        evaluateVisibility(
          {
            $or: [
              [{ $state: "/isAdmin" }, { $state: "/tab", eq: "settings" }],
              { $state: "/isSuperUser" },
            ],
          },
          {
            stateModel: { isAdmin: false, tab: "settings", isSuperUser: false },
          },
        ),
      ).toBe(false);
    });

    it("supports booleans inside $or", () => {
      expect(
        evaluateVisibility(
          { $or: [false, { $state: "/ok" }] },
          { stateModel: { ok: true } },
        ),
      ).toBe(true);
      expect(
        evaluateVisibility({ $or: [false, false] }, { stateModel: {} }),
      ).toBe(false);
    });
  });

  describe("$item conditions", () => {
    it("$item truthiness check", () => {
      expect(
        evaluateVisibility(
          { $item: "active" },
          { stateModel: {}, repeatItem: { active: true } },
        ),
      ).toBe(true);
    });

    it("$item falsy check", () => {
      expect(
        evaluateVisibility(
          { $item: "active" },
          { stateModel: {}, repeatItem: { active: false } },
        ),
      ).toBe(false);
    });

    it("$item equality check", () => {
      expect(
        evaluateVisibility(
          { $item: "status", eq: "done" },
          { stateModel: {}, repeatItem: { status: "done" } },
        ),
      ).toBe(true);
    });

    it("$item equality check fails", () => {
      expect(
        evaluateVisibility(
          { $item: "status", eq: "done" },
          { stateModel: {}, repeatItem: { status: "pending" } },
        ),
      ).toBe(false);
    });

    it("$item root reference", () => {
      expect(
        evaluateVisibility(
          { $item: "", eq: "hello" },
          { stateModel: {}, repeatItem: "hello" },
        ),
      ).toBe(true);
    });

    it("$item with not", () => {
      expect(
        evaluateVisibility(
          { $item: "active", not: true },
          { stateModel: {}, repeatItem: { active: true } },
        ),
      ).toBe(false);
    });

    it("$item returns false when no repeat scope", () => {
      expect(evaluateVisibility({ $item: "x" }, { stateModel: {} })).toBe(
        false,
      );
    });
  });

  describe("$index conditions", () => {
    it("$index equality check", () => {
      expect(
        evaluateVisibility(
          { $index: true, eq: 0 },
          { stateModel: {}, repeatIndex: 0 },
        ),
      ).toBe(true);
    });

    it("$index equality check fails", () => {
      expect(
        evaluateVisibility(
          { $index: true, eq: 0 },
          { stateModel: {}, repeatIndex: 1 },
        ),
      ).toBe(false);
    });

    it("$index gt check", () => {
      expect(
        evaluateVisibility(
          { $index: true, gt: 2 },
          { stateModel: {}, repeatIndex: 5 },
        ),
      ).toBe(true);
    });

    it("$index truthiness", () => {
      expect(
        evaluateVisibility(
          { $index: true },
          { stateModel: {}, repeatIndex: 3 },
        ),
      ).toBe(true);
    });

    it("$index zero is falsy", () => {
      expect(
        evaluateVisibility(
          { $index: true },
          { stateModel: {}, repeatIndex: 0 },
        ),
      ).toBe(false);
    });

    it("$index with not", () => {
      expect(
        evaluateVisibility(
          { $index: true, eq: 0, not: true },
          { stateModel: {}, repeatIndex: 1 },
        ),
      ).toBe(true);
    });
  });
});

describe("visibility helper", () => {
  it("always is true", () => {
    expect(visibility.always).toBe(true);
  });

  it("never is false", () => {
    expect(visibility.never).toBe(false);
  });

  it("when creates a $state condition", () => {
    expect(visibility.when("/user/isAdmin")).toEqual({
      $state: "/user/isAdmin",
    });
  });

  it("unless creates a negated $state condition", () => {
    expect(visibility.unless("/form/hasErrors")).toEqual({
      $state: "/form/hasErrors",
      not: true,
    });
  });

  it("eq creates an equality condition", () => {
    expect(visibility.eq("/tab", "home")).toEqual({
      $state: "/tab",
      eq: "home",
    });
  });

  it("neq creates an inequality condition", () => {
    expect(visibility.neq("/role", "guest")).toEqual({
      $state: "/role",
      neq: "guest",
    });
  });

  it("gt creates a greater-than condition", () => {
    expect(visibility.gt("/count", 5)).toEqual({
      $state: "/count",
      gt: 5,
    });
  });

  it("gte creates a gte condition", () => {
    expect(visibility.gte("/count", 5)).toEqual({
      $state: "/count",
      gte: 5,
    });
  });

  it("lt creates a less-than condition", () => {
    expect(visibility.lt("/count", 5)).toEqual({
      $state: "/count",
      lt: 5,
    });
  });

  it("lte creates a lte condition", () => {
    expect(visibility.lte("/count", 5)).toEqual({
      $state: "/count",
      lte: 5,
    });
  });

  it("and returns an $and wrapper", () => {
    const result = visibility.and(
      visibility.when("/isAdmin"),
      visibility.eq("/tab", "home"),
    );
    expect(result).toEqual({
      $and: [{ $state: "/isAdmin" }, { $state: "/tab", eq: "home" }],
    });
  });

  it("or returns an $or wrapper", () => {
    const result = visibility.or(
      visibility.when("/isAdmin"),
      visibility.when("/isModerator"),
    );
    expect(result).toEqual({
      $or: [{ $state: "/isAdmin" }, { $state: "/isModerator" }],
    });
  });
});

describe("splitRepeatVisibility", () => {
  it("passes through pure container conditions", () => {
    const cond = { $state: "/show", eq: true };
    expect(splitRepeatVisibility(cond)).toEqual({
      container: cond,
      itemFilter: undefined,
    });
    expect(splitRepeatVisibility(undefined)).toEqual({
      container: undefined,
      itemFilter: undefined,
    });
    expect(splitRepeatVisibility(true)).toEqual({
      container: true,
      itemFilter: undefined,
    });
  });

  it("routes pure item conditions to the item filter", () => {
    const cond = { $item: "status", eq: "todo" };
    expect(splitRepeatVisibility(cond)).toEqual({
      container: undefined,
      itemFilter: cond,
    });
  });

  it("partitions AND-composed mixed conditions", () => {
    const state = { $state: "/show", eq: true };
    const item = { $item: "status", eq: "todo" };
    for (const cond of [[state, item], { $and: [state, item] }]) {
      expect(splitRepeatVisibility(cond as never)).toEqual({
        container: { $and: [state] },
        itemFilter: { $and: [item] },
      });
    }
  });

  it("keeps mixed $or entirely as an item filter", () => {
    const cond = {
      $or: [
        { $state: "/all", eq: true },
        { $item: "pinned", eq: true },
      ],
    };
    expect(splitRepeatVisibility(cond)).toEqual({
      container: undefined,
      itemFilter: cond,
    });
  });
});

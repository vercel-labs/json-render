import { describe, it, expect, vi } from "vitest";
import {
  resolvePropValue,
  createDirectiveRegistry,
  type PropResolutionContext,
} from "@json-render/core";
import { formatDirective } from "./format";
import { mathDirective } from "./math";
import { concatDirective } from "./concat";
import { countDirective } from "./count";
import { truncateDirective } from "./truncate";
import { pluralizeDirective } from "./pluralize";
import { joinDirective } from "./join";
import { createI18nDirective } from "./i18n";

const allDirectives = [
  formatDirective,
  mathDirective,
  concatDirective,
  countDirective,
  truncateDirective,
  pluralizeDirective,
  joinDirective,
];

function makeCtx(
  state: Record<string, unknown> = {},
  extra: Partial<PropResolutionContext> = {},
): PropResolutionContext {
  return {
    stateModel: state,
    directives: createDirectiveRegistry(allDirectives),
    ...extra,
  };
}

// ============================================================================
// $format
// ============================================================================

describe("$format", () => {
  it("formats a number", () => {
    const ctx = makeCtx();
    const result = resolvePropValue({ $format: "number", value: 1234.56 }, ctx);
    expect(typeof result).toBe("string");
    expect(result).toContain("1");
  });

  it("formats currency", () => {
    const ctx = makeCtx({ total: 42.5 });
    const result = resolvePropValue(
      { $format: "currency", value: { $state: "/total" }, currency: "USD" },
      ctx,
    );
    expect(typeof result).toBe("string");
    expect(result).toContain("42");
  });

  it("formats percent", () => {
    const ctx = makeCtx();
    const result = resolvePropValue({ $format: "percent", value: 0.75 }, ctx);
    expect(typeof result).toBe("string");
    expect(result).toContain("75");
  });

  it("formats a date", () => {
    const ctx = makeCtx();
    const result = resolvePropValue(
      { $format: "date", value: "2024-01-15" },
      ctx,
    );
    expect(typeof result).toBe("string");
    expect(result).toContain("2024");
  });

  it("formats a relative date with injectable now", () => {
    const ctx = makeCtx();
    const baseDate = new Date("2024-06-15T12:00:00Z").getTime();
    const result = resolvePropValue(
      {
        $format: "date",
        value: "2024-06-15T12:00:00Z",
        style: "relative",
        now: baseDate + 3 * 60 * 60 * 1000,
      },
      ctx,
    );
    expect(result).toBe("3h ago");
  });

  it("formats a future relative date", () => {
    const ctx = makeCtx();
    const baseDate = new Date("2024-06-15T12:00:00Z").getTime();
    const result = resolvePropValue(
      {
        $format: "date",
        value: "2024-06-15T12:00:00Z",
        style: "relative",
        now: baseDate - 2 * 60 * 60 * 1000,
      },
      ctx,
    );
    expect(result).toBe("2h from now");
  });

  it("returns 'just now' when date equals now", () => {
    const ctx = makeCtx();
    const ts = new Date("2024-06-15T12:00:00Z").getTime();
    const result = resolvePropValue(
      {
        $format: "date",
        value: "2024-06-15T12:00:00Z",
        style: "relative",
        now: ts,
      },
      ctx,
    );
    expect(result).toBe("just now");
  });

  it("formats a date-only ISO string as that calendar day in US timezones", () => {
    const ctx = makeCtx();
    const result = resolvePropValue(
      {
        $format: "date",
        value: "2024-01-15",
        options: {
          timeZone: "America/New_York",
          year: "numeric",
          month: "numeric",
          day: "numeric",
        },
      },
      ctx,
    ) as string;
    expect(result).toMatch(/15/);
    expect(result).not.toMatch(/14/);
  });

  it("does not throw on an invalid date", () => {
    const ctx = makeCtx();
    expect(() =>
      resolvePropValue({ $format: "date", value: "not-a-date" }, ctx),
    ).not.toThrow();
  });
});

// ============================================================================
// $math
// ============================================================================

describe("$math", () => {
  it("adds two values", () => {
    const ctx = makeCtx({ a: 10, b: 5 });
    expect(
      resolvePropValue(
        { $math: "add", a: { $state: "/a" }, b: { $state: "/b" } },
        ctx,
      ),
    ).toBe(15);
  });

  it("subtracts", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "subtract", a: 10, b: 3 }, ctx)).toBe(7);
  });

  it("multiplies", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "multiply", a: 4, b: 5 }, ctx)).toBe(20);
  });

  it("divides", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "divide", a: 10, b: 4 }, ctx)).toBe(2.5);
  });

  it("handles division by zero", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "divide", a: 10, b: 0 }, ctx)).toBe(0);
  });

  it("computes modulo", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "mod", a: 10, b: 3 }, ctx)).toBe(1);
  });

  it("computes min", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "min", a: 10, b: 3 }, ctx)).toBe(3);
  });

  it("computes max", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "max", a: 10, b: 3 }, ctx)).toBe(10);
  });

  it("rounds", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "round", a: 3.7 }, ctx)).toBe(4);
  });

  it("floors", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "floor", a: 3.7 }, ctx)).toBe(3);
  });

  it("ceils", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "ceil", a: 3.2 }, ctx)).toBe(4);
  });

  it("computes abs", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "abs", a: -5 }, ctx)).toBe(5);
  });

  it("defaults missing operand b to 0", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "add", a: 5 }, ctx)).toBe(5);
  });

  it("defaults missing operand a to 0", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $math: "add", b: 3 }, ctx)).toBe(3);
  });

  it("warns when a non-numeric value is coerced to 0", () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = resolvePropValue({ $math: "add", a: "foo", b: 3 }, ctx);
    expect(result).toBe(3);
    expect(spy).toHaveBeenCalledWith(
      "$math: non-numeric value coerced to 0:",
      "foo",
    );
    spy.mockRestore();
  });
});

// ============================================================================
// $concat
// ============================================================================

describe("$concat", () => {
  it("concatenates strings", () => {
    const ctx = makeCtx({ first: "John", last: "Doe" });
    expect(
      resolvePropValue(
        { $concat: [{ $state: "/first" }, " ", { $state: "/last" }] },
        ctx,
      ),
    ).toBe("John Doe");
  });

  it("handles null values", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $concat: ["hello", null, "world"] }, ctx)).toBe(
      "helloworld",
    );
  });

  it("converts non-strings", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $concat: ["count: ", 42] }, ctx)).toBe(
      "count: 42",
    );
  });
});

// ============================================================================
// $count
// ============================================================================

describe("$count", () => {
  it("counts array items", () => {
    const ctx = makeCtx({ items: [1, 2, 3] });
    expect(resolvePropValue({ $count: { $state: "/items" } }, ctx)).toBe(3);
  });

  it("counts string length", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $count: "hello" }, ctx)).toBe(5);
  });

  it("returns 0 for non-countable", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $count: 42 }, ctx)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    const ctx = makeCtx({ items: [] });
    expect(resolvePropValue({ $count: { $state: "/items" } }, ctx)).toBe(0);
  });
});

// ============================================================================
// $truncate
// ============================================================================

describe("$truncate", () => {
  it("truncates long text", () => {
    const ctx = makeCtx();
    const text = "a".repeat(200);
    const result = resolvePropValue(
      { $truncate: text, length: 10, suffix: "..." },
      ctx,
    ) as string;
    expect(result.length).toBe(13);
    expect(result).toBe("a".repeat(10) + "...");
  });

  it("does not truncate short text", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $truncate: "hello", length: 10 }, ctx)).toBe(
      "hello",
    );
  });

  it("uses default length and suffix", () => {
    const ctx = makeCtx();
    const text = "a".repeat(200);
    const result = resolvePropValue({ $truncate: text }, ctx) as string;
    expect(result.length).toBe(103); // 100 + "..."
  });

  it("resolves dynamic values", () => {
    const ctx = makeCtx({ body: "hello world this is a test" });
    expect(
      resolvePropValue(
        { $truncate: { $state: "/body" }, length: 11, suffix: "…" },
        ctx,
      ),
    ).toBe("hello world…");
  });
});

// ============================================================================
// $pluralize
// ============================================================================

describe("$pluralize", () => {
  it("handles singular", () => {
    const ctx = makeCtx();
    expect(
      resolvePropValue({ $pluralize: 1, one: "item", other: "items" }, ctx),
    ).toBe("1 item");
  });

  it("handles plural", () => {
    const ctx = makeCtx();
    expect(
      resolvePropValue({ $pluralize: 5, one: "item", other: "items" }, ctx),
    ).toBe("5 items");
  });

  it("handles zero with zero form", () => {
    const ctx = makeCtx();
    expect(
      resolvePropValue(
        { $pluralize: 0, one: "item", other: "items", zero: "no items" },
        ctx,
      ),
    ).toBe("no items");
  });

  it("handles zero without zero form", () => {
    const ctx = makeCtx();
    expect(
      resolvePropValue({ $pluralize: 0, one: "item", other: "items" }, ctx),
    ).toBe("0 items");
  });

  it("resolves count from state", () => {
    const ctx = makeCtx({ count: 3 });
    expect(
      resolvePropValue(
        { $pluralize: { $state: "/count" }, one: "file", other: "files" },
        ctx,
      ),
    ).toBe("3 files");
  });

  it("coerces string count to number", () => {
    const ctx = makeCtx();
    expect(
      resolvePropValue({ $pluralize: "3", one: "item", other: "items" }, ctx),
    ).toBe("3 items");
  });
});

// ============================================================================
// $join
// ============================================================================

describe("$join", () => {
  it("joins array with default separator", () => {
    const ctx = makeCtx({ tags: ["red", "green", "blue"] });
    expect(resolvePropValue({ $join: { $state: "/tags" } }, ctx)).toBe(
      "red, green, blue",
    );
  });

  it("joins with custom separator", () => {
    const ctx = makeCtx({ tags: ["a", "b", "c"] });
    expect(
      resolvePropValue({ $join: { $state: "/tags" }, separator: " | " }, ctx),
    ).toBe("a | b | c");
  });

  it("handles non-array values", () => {
    const ctx = makeCtx();
    expect(resolvePropValue({ $join: "hello" }, ctx)).toBe("hello");
  });

  it("handles null items", () => {
    const ctx = makeCtx({ items: ["a", null, "b"] });
    expect(
      resolvePropValue({ $join: { $state: "/items" }, separator: "-" }, ctx),
    ).toBe("a--b");
  });
});

// ============================================================================
// $t (i18n)
// ============================================================================

describe("createI18nDirective", () => {
  const tDirective = createI18nDirective({
    locale: "en",
    messages: {
      en: {
        greeting: "Hello, {{name}}!",
        "checkout.submit": "Place Order",
        "items.count": "{{count}} items in cart",
      },
      es: {
        greeting: "Hola, {{name}}!",
        "checkout.submit": "Realizar Pedido",
      },
    },
    fallbackLocale: "en",
  });

  function makeI18nCtx(
    state: Record<string, unknown> = {},
  ): PropResolutionContext {
    return {
      stateModel: state,
      directives: createDirectiveRegistry([tDirective]),
    };
  }

  it("translates a simple key", () => {
    const ctx = makeI18nCtx();
    expect(resolvePropValue({ $t: "checkout.submit" }, ctx)).toBe(
      "Place Order",
    );
  });

  it("interpolates parameters", () => {
    const ctx = makeI18nCtx({ name: "Alice" });
    expect(
      resolvePropValue(
        { $t: "greeting", params: { name: { $state: "/name" } } },
        ctx,
      ),
    ).toBe("Hello, Alice!");
  });

  it("returns key for missing translations", () => {
    const ctx = makeI18nCtx();
    expect(resolvePropValue({ $t: "missing.key" }, ctx)).toBe("missing.key");
  });

  it("handles multiple params", () => {
    const ctx = makeI18nCtx({ count: 3 });
    expect(
      resolvePropValue(
        { $t: "items.count", params: { count: { $state: "/count" } } },
        ctx,
      ),
    ).toBe("3 items in cart");
  });
});

// ============================================================================
// Composition tests
// ============================================================================

describe("directive composition", () => {
  it("composes $math inside $format", () => {
    const ctx = makeCtx({ price: 10, qty: 3 });
    const result = resolvePropValue(
      {
        $format: "currency",
        value: {
          $math: "multiply",
          a: { $state: "/price" },
          b: { $state: "/qty" },
        },
        currency: "USD",
      },
      ctx,
    );
    expect(typeof result).toBe("string");
    expect(result).toContain("30");
  });

  it("composes $count inside $pluralize", () => {
    const ctx = makeCtx({ items: [1, 2, 3] });
    expect(
      resolvePropValue(
        {
          $pluralize: { $count: { $state: "/items" } },
          one: "item",
          other: "items",
        },
        ctx,
      ),
    ).toBe("3 items");
  });
});

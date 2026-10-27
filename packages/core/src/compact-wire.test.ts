import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createCompactWireCodec } from "./compact-wire";

describe("compact strict wire codec", () => {
  it("distinguishes omitted properties from explicit null and retains refinements", () => {
    const original = z
      .object({
        label: z.string().nullable().optional(),
        count: z.number().int().min(1),
      })
      .refine((value) => value.label !== "blocked", "Blocked label");
    const wire = createCompactWireCodec()(original);
    expect(wire.parse({ label: null, count: 1 })).toEqual({ count: 1 });
    expect(wire.parse({ label: { value: null }, count: 1 })).toEqual({
      label: null,
      count: 1,
    });
    expect(wire.parse({ label: { value: "ok" }, count: 2 })).toEqual({
      label: "ok",
      count: 2,
    });
    expect(() => wire.parse({ count: 1 })).toThrow();
    expect(() => wire.parse({ label: null, count: 0 })).toThrow();
    expect(() => wire.parse({ label: null, count: 1.5 })).toThrow();
    expect(() => wire.parse({ label: { value: "blocked" }, count: 1 })).toThrow(
      "Blocked label",
    );
    expect(() => wire.parse({ label: null, count: 1, extra: true })).toThrow();
  });

  it("preserves arbitrary record keys safely and rejects duplicates and invalid values", () => {
    const wire = createCompactWireCodec()(
      z.object({ values: z.record(z.string(), z.number().nonnegative()) }),
    );
    const decoded = wire.parse({
      values: {
        entries: [
          { key: "__proto__", value: 1 },
          { key: "constructor", value: 2 },
          { key: "a/b~c", value: 3 },
        ],
      },
    }) as { values: Record<string, number> };
    expect(Object.getPrototypeOf(decoded.values)).toBe(Object.prototype);
    expect(Object.hasOwn(decoded.values, "__proto__")).toBe(true);
    expect(decoded.values).toEqual(
      JSON.parse('{"__proto__":1,"constructor":2,"a/b~c":3}'),
    );
    expect(() =>
      wire.parse({
        values: {
          entries: [
            { key: "same", value: 1 },
            { key: "same", value: 2 },
          ],
        },
      }),
    ).toThrow(/duplicate/i);
    expect(() =>
      wire.parse({ values: { entries: [{ key: "__proto__", value: -1 }] } }),
    ).toThrow();
    const constrained = createCompactWireCodec()(
      z.record(z.enum(["a", "b"]), z.number()),
    );
    expect(() =>
      constrained.parse({ entries: [{ key: "a", value: 1 }] }),
    ).toThrow();
    expect(() =>
      constrained.parse({ entries: [{ key: "other", value: 1 }] }),
    ).toThrow();
  });

  it("tags colliding union encodings and leaves disjoint alternatives untagged", () => {
    const wire = createCompactWireCodec()(
      z.union([
        z.record(z.string(), z.number()),
        z.object({
          entries: z.array(z.object({ key: z.string(), value: z.number() })),
        }),
      ]),
    );
    const value = { entries: [{ key: "x", value: 2 }] };
    expect(wire.parse({ case: 0, value })).toEqual({ x: 2 });
    expect(wire.parse({ case: 1, value })).toEqual(value);
    expect(() => wire.parse(value)).toThrow();
    expect(() => wire.parse({ case: 2, value })).toThrow();
    const disjoint = createCompactWireCodec()(
      z.union([z.string(), z.object({ text: z.string() })]),
    );
    expect(disjoint.parse("text")).toBe("text");
    expect(disjoint.parse({ text: "text" })).toEqual({ text: "text" });
    const optional = createCompactWireCodec()(
      z.union([z.string().optional(), z.object({ value: z.number() })]),
    );
    expect(optional.parse({ case: 0, value: null })).toBeUndefined();
    expect(optional.parse({ case: 1, value: { value: 2 } })).toEqual({
      value: 2,
    });
  });

  it("decodes recursive nodes and unknown JSON without conflating objects and arrays", () => {
    const original: z.ZodType = z.lazy(() =>
      z.object({
        text: z.string(),
        children: z.array(original).optional(),
        data: z.unknown(),
      }),
    );
    const wire = createCompactWireCodec()(original);
    expect(
      wire.parse({
        text: "root",
        children: {
          value: [{ text: "child", children: null, data: null }],
        },
        data: {
          entries: [
            {
              key: "__proto__",
              value: { entries: [{ key: "safe", value: true }] },
            },
            { key: "items", value: [1, "two", false, null] },
          ],
        },
      }),
    ).toEqual({
      text: "root",
      children: [{ text: "child", data: null }],
      data: JSON.parse(
        '{"__proto__":{"safe":true},"items":[1,"two",false,null]}',
      ),
    });
    expect(() =>
      wire.parse({ text: "root", children: null, data: { arbitrary: 1 } }),
    ).toThrow();
    expect(() =>
      wire.parse({ text: "root", children: null, data: undefined }),
    ).toThrow();
  });

  it("retains array bounds and custom checks on decoded elements", () => {
    const original = z
      .array(z.object({ value: z.number().optional() }))
      .min(1)
      .max(2)
      .refine((items) => items.some((item) => item.value === 3), "Needs three");
    const wire = createCompactWireCodec()(original);
    expect(wire.parse([{ value: null }, { value: { value: 3 } }])).toEqual([
      {},
      { value: 3 },
    ]);
    expect(() => wire.parse([])).toThrow();
    expect(() => wire.parse([{ value: null }])).toThrow("Needs three");
    expect(() =>
      wire.parse(Array.from({ length: 3 }, () => ({ value: { value: 3 } }))),
    ).toThrow();
    const json = z.toJSONSchema(wire, { io: "input" });
    expect(json.minItems).toBe(1);
    expect(json.maxItems).toBe(2);
  });

  it("preserves wrapper refinements and checks that defer unresolved expressions", () => {
    const convert = createCompactWireCodec();
    expect(() =>
      convert(
        z
          .string()
          .optional()
          .refine((value) => value !== undefined, "Required"),
      ).parse(null),
    ).toThrow("Required");
    expect(() =>
      convert(
        z
          .string()
          .nullable()
          .refine((value) => value !== null, "Not null"),
      ).parse(null),
    ).toThrow("Not null");
    expect(() =>
      convert(
        z.lazy(() => z.number()).refine((value) => value > 0, "Positive"),
      ).parse(-1),
    ).toThrow("Positive");
    const value = z.union([
      z.number().nonnegative(),
      z.strictObject({ $state: z.string() }),
    ]);
    const original = z
      .object({ start: value, end: value })
      .refine(
        (range) =>
          typeof range.start === "object" ||
          typeof range.end === "object" ||
          range.end >= range.start,
        "Invalid range",
      );
    const wire = convert(original);
    expect(wire.parse({ start: { $state: "/start" }, end: 2 })).toEqual({
      start: { $state: "/start" },
      end: 2,
    });
    expect(() => wire.parse({ start: 5, end: 2 })).toThrow("Invalid range");
    expect(() =>
      wire.parse({ start: { $state: "/start" }, end: -1 }),
    ).toThrow();
  });

  it("exports only closed objects with all properties required, including recursive definitions", () => {
    const node: z.ZodType = z.lazy(() =>
      z.object({
        children: z.array(node).optional(),
        props: z.object({ title: z.string().nullish() }),
        state: z.record(z.string(), z.any()),
        choice: z.union([z.record(z.string(), z.number()), z.unknown()]),
      }),
    );
    const json = z.toJSONSchema(createCompactWireCodec()(node), {
      io: "input",
      reused: "ref",
    });
    let objects = 0;
    function audit(value: unknown) {
      if (!value || typeof value !== "object") return;
      const schema = value as Record<string, unknown>;
      if (schema.type === "object") {
        objects++;
        expect(schema.additionalProperties).toBe(false);
        expect([...((schema.required as string[]) ?? [])].sort()).toEqual(
          Object.keys(schema.properties ?? {}).sort(),
        );
      }
      Object.values(value).forEach(audit);
    }
    audit(json);
    expect(objects).toBeGreaterThan(4);
    expect(JSON.stringify(json)).toContain("$ref");
  });

  it.each([
    ["tuple", z.tuple([z.string(), z.number()])],
    [
      "intersection",
      z.intersection(z.object({ a: z.string() }), z.object({ b: z.string() })),
    ],
    ["pipe", z.string().transform((value) => value.length)],
    ["default", z.string().default("fallback")],
    ["object", z.object({}).passthrough()],
    ["object", z.object({}).catchall(z.string())],
    ["date", z.date()],
    ["string", z.coerce.string()],
    ["string", z.string().overwrite((value) => value.trim())],
  ])("rejects unsupported %s schemas explicitly", (type, original) => {
    expect(() => createCompactWireCodec()(original)).toThrow(
      new RegExp(`Unsupported.*${type}`),
    );
  });

  it("reports paths for unsupported types reached through lazy schemas", () => {
    const wire = createCompactWireCodec()(
      z.object({
        props: z.lazy(() =>
          z.object({
            items: z.array(z.object({ pair: z.tuple([z.string()]) })),
          }),
        ),
      }),
    );
    expect(() => z.toJSONSchema(wire, { io: "input" })).toThrow(
      'Unsupported compact wire schema type: tuple at $["props"].lazy["items"][]["pair"]',
    );
  });
});

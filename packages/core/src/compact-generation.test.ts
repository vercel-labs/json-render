import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createCompactGeneration } from "./compact-generation";
import { applySpecPatch, createSpecStreamCompiler, type Spec } from "./types";
import { resolveElementProps } from "./props";
const generation = () =>
  createCompactGeneration({
    components: {
      Panel: {
        props: z.object({ title: z.string() }),
        slots: ["default", "header"],
      },
      "Reading / value": {
        props: z.object({ value: z.number(), unit: z.string().optional() }),
      },
    },
  });
const document = {
  state: { enabled: true },
  root: {
    type: "Panel",
    props: { title: '雪 "quoted"' },
    visible: { $state: "/enabled" },
    children: [{ type: "Reading / value", props: { value: -2.5, unit: "°C" } }],
    slots: { header: [{ type: "Reading / value", props: { value: 0 } }] },
  },
};
describe("schema-enforced compact generation", () => {
  it("decodes strict wire values while publishing parents before their children finish", () => {
    const gen = createCompactGeneration(
      {
        components: {
          Panel: {
            props: z.object({
              title: z.string(),
              note: z.string().nullable().optional(),
              extra: z.string().optional(),
            }),
            slots: ["default", "header"],
          },
          Reading: { props: z.object({ value: z.number().positive() }) },
        },
      },
      { strict: true },
    );
    const fields = {
      children: [],
      slots: {},
      visible: null,
      on: null,
      watch: null,
      repeat: null,
    };
    const root = {
      ...fields,
      type: "Panel",
      props: { title: "Overview", note: { value: null }, extra: null },
      children: [
        { ...fields, type: "Reading", props: { value: { $state: "/count" } } },
      ],
      slots: {
        header: [{ ...fields, type: "Reading", props: { value: 2 } }],
      },
    };
    const compiler = gen.createCompiler();
    const prefix =
      '{"state":{"value":{"entries":[{"key":"count","value":3}]}},"root":' +
      '{"type":"Panel","props":{"title":"Overview","note":{"value":null},"extra":null}';
    for (const character of prefix) compiler.push(character);
    expect(compiler.push("").result.elements.e0?.props).toEqual({
      title: "Overview",
      note: null,
    });
    const suffix =
      `,"children":${JSON.stringify(root.children)},"slots":${JSON.stringify(root.slots)},` +
      '"visible":null,"on":null,"watch":null,"repeat":null}}';
    for (const character of suffix) compiler.push(character);
    const result = compiler.getResult();
    expect(result.state).toEqual({ count: 3 });
    expect(result.elements.e0?.children).toEqual(["e1"]);
    expect(result.elements.e0?.slots).toEqual({ header: ["e2"] });
    expect(
      resolveElementProps(result.elements.e1!.props, {
        stateModel: result.state!,
      }),
    ).toEqual({ value: 3 });
    expect(() =>
      gen.createCompiler().push(
        JSON.stringify({
          state: null,
          root: { ...fields, type: "Reading", props: { value: -1 } },
        }),
      ),
    ).toThrow();
    const missing = gen.createCompiler();
    missing.push(JSON.stringify({ root }));
    expect(() => missing.getResult()).toThrow();
    function check(schema: Record<string, unknown>) {
      if (schema.type === "object") {
        expect(schema.additionalProperties).toBe(false);
        expect(new Set(schema.required as string[])).toEqual(
          new Set(Object.keys(schema.properties as object)),
        );
      }
      for (const [key, value] of Object.entries(schema)) {
        if (["const", "enum", "default", "examples"].includes(key)) continue;
        if (Array.isArray(value))
          value.forEach(
            (child) => child && typeof child === "object" && check(child),
          );
        else if (value && typeof value === "object")
          check(value as Record<string, unknown>);
      }
    }
    check(gen.jsonSchema);
  });
  it("preserves strict record keys in state and nested props without skipping value validation", () => {
    const records = (value: z.ZodType) =>
      createCompactGeneration(
        {
          components: {
            Records: {
              props: z.object({
                data: z.object({
                  records: z.array(z.record(z.string(), value)),
                }),
              }),
            },
          },
        },
        { strict: true },
      );
    const gen = records(z.number().positive());
    const record = {
      entries: [
        { key: "__proto__", value: 1 },
        { key: "constructor", value: 2 },
        { key: "a/b~c", value: 3 },
      ],
    };
    const root = {
      type: "Records",
      props: { data: { records: [record] } },
      children: [],
      slots: {},
      visible: null,
      on: null,
      watch: null,
      repeat: null,
    };
    const source = JSON.stringify({
      state: {
        value: {
          entries: [...record.entries, { key: "nested", value: record }],
        },
      },
      root,
    });
    const expected = JSON.parse('{"__proto__":1,"constructor":2,"a/b~c":3}');
    for (const chunks of [[source], [...source]]) {
      const compiler = gen.createCompiler();
      const replay = createSpecStreamCompiler();
      for (const chunk of chunks) {
        for (const patch of compiler.push(chunk).newPatches)
          replay.push(JSON.stringify(patch) + "\n");
      }
      const result = compiler.getResult();
      expect(result.state).toEqual({ ...expected, nested: expected });
      expect(result.elements.e0?.props).toEqual({
        data: { records: [expected] },
      });
      expect(Object.getPrototypeOf(result.state)).toBe(Object.prototype);
      expect(replay.getResult()).toEqual(result);
    }
    const withValue = (value: unknown) => ({
      ...root,
      props: {
        data: { records: [{ entries: [{ key: "__proto__", value }] }] },
      },
    });
    for (const [value, issue] of [
      [-1, "too_small"],
      ["wrong", "invalid_type"],
    ]) {
      expect(() =>
        gen
          .createCompiler()
          .push(JSON.stringify({ state: null, root: withValue(value) })),
      ).toThrow(new RegExp(String(issue)));
    }
    const nested = records(z.object({ count: z.number() }));
    for (const key of ["extra", "__proto__"]) {
      expect(() =>
        nested.createCompiler().push(
          JSON.stringify({
            state: null,
            root: withValue(
              Object.fromEntries([
                ["count", 1],
                [key, 2],
              ]),
            ),
          }),
        ),
      ).toThrow(/unrecognized_keys/);
    }
    expect(() =>
      records(z.object({ count: z.number().transform((value) => value + 1) })),
    ).toThrow(/Unsupported compact wire schema type: pipe/);
  });
  it("does not evaluate refinements from unrelated component types", () => {
    let unrelatedValidations = 0;
    const compiler = createCompactGeneration({
      components: {
        Unused: {
          props: z.object({
            text: z.string().refine(() => {
              unrelatedValidations++;
              return true;
            }),
          }),
        },
        Text: { props: z.object({ text: z.string() }) },
      },
    }).createCompiler();
    compiler.push('{"root":{"type":"Text","props":{"text":"Hello"}}}');
    expect(compiler.getResult().elements.e0).toEqual({
      type: "Text",
      props: { text: "Hello" },
    });
    expect(unrelatedValidations).toBe(0);
  });
  it("rejects invalid repeat state when the stream finishes, regardless of field order", async () => {
    const root = {
      type: "Panel",
      props: { title: "Saved" },
      repeat: { statePath: "/saved" },
      children: [{ type: "Reading / value", props: { value: 1 } }],
    };
    for (const stateFirst of [true, false]) {
      const state = { saved: false };
      const source = JSON.stringify(
        stateFirst ? { state, root } : { root, state },
      );
      const stream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue(source);
          controller.close();
        },
      }).pipeThrough(generation().createTransform());
      const drain = async () => {
        const reader = stream.getReader();
        while (!(await reader.read()).done) {}
      };
      await expect(drain()).rejects.toThrow(/array in state/);
    }
    const compiler = generation().createCompiler();
    compiler.push(JSON.stringify({ state: { saved: [1, 2] }, root }));
    expect(compiler.getResult().state).toEqual({ saved: [1, 2] });
  });
  it("preserves expressions inside structured props and still rejects invalid literal siblings", () => {
    const gen = createCompactGeneration({
      components: {
        Plot: {
          props: z.object({
            points: z
              .array(
                z.object({
                  label: z.string(),
                  value: z.number().nonnegative(),
                }),
              )
              .min(1),
            style: z
              .object({ color: z.string(), width: z.number().positive() })
              .optional(),
          }),
        },
      },
    });
    const props = {
      points: [{ label: { $state: "/label" }, value: 12 }],
      style: { color: { $state: "/color" }, width: 10 },
    };
    const exported = z.fromJSONSchema(gen.jsonSchema);
    expect(exported.safeParse({ root: { type: "Plot", props } }).success).toBe(
      true,
    );
    expect(
      exported.safeParse({
        root: { type: "Plot", props, slots: { title: "invented" } },
      }).success,
    ).toBe(false);
    const parser = gen.createCompiler();
    parser.push(JSON.stringify({ root: { type: "Plot", props } }));
    expect(parser.getResult().elements.e0?.props).toEqual(props);
    expect(
      resolveElementProps(parser.getResult().elements.e0!.props, {
        stateModel: { label: "Revenue", color: "blue" },
      }),
    ).toEqual({
      points: [{ label: "Revenue", value: 12 }],
      style: { color: "blue", width: 10 },
    });
    for (const invalid of [
      { ...props, points: [] },
      { ...props, points: [{ label: { $state: "/label" }, value: -1 }] },
      { ...props, style: { color: { $state: "/color" }, width: "wide" } },
    ])
      expect(() =>
        gen
          .createCompiler()
          .push(JSON.stringify({ root: { type: "Plot", props: invalid } })),
      ).toThrow();
  });
  it("retains recursive, union, tuple and record prop contracts", () => {
    const recursive: z.ZodType = z.lazy(() =>
      z.object({ name: z.string(), next: recursive.optional() }),
    );
    const props = z.object({
      tree: recursive,
      pair: z.tuple([z.string(), z.number()]),
      records: z.record(z.string(), z.number()),
      choice: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("a"), value: z.number() }),
        z.object({ kind: z.literal("b"), value: z.string() }),
      ]),
      range: z
        .object({ start: z.number(), end: z.number() })
        .refine((p) => p.end >= p.start, "Invalid nested range"),
    });
    const gen = createCompactGeneration({ components: { Data: { props } } });
    const values = {
      tree: { name: { $state: "/name" }, next: { name: "child" } },
      pair: [{ $state: "/name" }, 2],
      records: { a: { $state: "/count" } },
      choice: { kind: "a", value: { $state: "/count" } },
      range: { start: 1, end: 2 },
    };
    const parser = gen.createCompiler();
    parser.push(JSON.stringify({ root: { type: "Data", props: values } }));
    expect(
      props.parse(
        resolveElementProps(parser.getResult().elements.e0!.props, {
          stateModel: { name: "parent", count: 3 },
        }),
      ),
    ).toEqual({
      tree: { name: "parent", next: { name: "child" } },
      pair: ["parent", 2],
      records: { a: 3 },
      choice: { kind: "a", value: 3 },
      range: { start: 1, end: 2 },
    });
    expect(() =>
      gen.createCompiler().push(
        JSON.stringify({
          root: {
            type: "Data",
            props: { ...values, range: { start: 5, end: 2 } },
          },
        }),
      ),
    ).toThrow("Invalid nested range");
  });
  it("accepts empty containers and preserves catalog refinements", () => {
    const empty = generation().createCompiler();
    empty.push(
      JSON.stringify({ root: { type: "Panel", props: { title: "Empty" } } }),
    );
    expect(empty.getResult().elements.e0?.children).toEqual([]);
    const refined = createCompactGeneration({
      components: {
        Range: {
          props: z
            .object({ start: z.number(), end: z.number() })
            .refine((p) => p.end >= p.start, "Invalid range"),
        },
      },
    }).createCompiler();
    expect(() =>
      refined.push(
        JSON.stringify({
          root: { type: "Range", props: { start: 5, end: 2 } },
        }),
      ),
    ).toThrow("Invalid range");
  });
  it("keeps local schema references valid for props named like schema keywords", () => {
    const text = z.string();
    const schema = createCompactGeneration({
      components: {
        Record: {
          props: z.object({ const: text, enum: text, properties: text }),
        },
      },
    }).jsonSchema;
    function check(value: unknown) {
      if (!value || typeof value !== "object") return;
      const object = value as Record<string, unknown>;
      if (
        typeof object.$ref === "string" &&
        object.$ref.startsWith("#/$defs/")
      ) {
        expect(schema.$defs).toHaveProperty(object.$ref.slice(8));
      }
      Object.values(object).forEach(check);
    }
    check(schema);
  });
  it.each([1, 7, 10000])(
    "streams nested components across %i-character boundaries",
    (size) => {
      const parser = generation().createCompiler(),
        source = JSON.stringify(document);
      let rendered = { root: "", elements: {} } as Spec,
        early: Spec | undefined,
        firstAt = 0;
      for (let i = 0; i < source.length; i += size) {
        const { result, newPatches } = parser.push(source.slice(i, i + size));
        for (const p of newPatches) rendered = applySpecPatch(rendered, p);
        if (!early && result.elements["e1"]) {
          early = result;
          firstAt = i;
        }
      }
      const final = parser.getResult();
      expect(final).toEqual(rendered);
      expect(final.state).toEqual({ enabled: true });
      expect(final.elements.e0?.children).toEqual(["e1"]);
      expect(final.elements.e0?.slots).toEqual({ header: ["e2"] });
      expect(final.elements["e1"]?.props).toEqual({ value: -2.5, unit: "°C" });
      if (size === 1) {
        expect(firstAt).toBeLessThan(source.length - 1);
        expect(early?.elements["e2"]).toBeUndefined();
      }
    },
  );
  it("feeds stock JSONL consumers without changing their transport", async () => {
    const source = new ReadableStream<string>({
      start(c) {
        for (const char of JSON.stringify(document)) c.enqueue(char);
        c.close();
      },
    });
    const reader = source
        .pipeThrough(generation().createTransform())
        .getReader(),
      stock = createSpecStreamCompiler<Spec>();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      stock.push(value);
    }
    expect(stock.getResult().elements["e1"]?.props.value).toBe(-2.5);
  });
  it.each([
    { type: "Reading / value", props: { value: "wrong" } },
    { type: "Reading / value", props: { value: 2, invented: true } },
    { type: "Unknown", props: {} },
    { type: "Panel", props: { title: "x" }, children: ["missing"] },
    { id: "invented", type: "Reading / value", props: { value: 2 } },
    {
      type: "Reading / value",
      props: { value: 1 },
      children: [{ type: "Reading / value", props: { value: 2 } }],
    },
  ])("rejects invalid nodes without repair: %j", (root) => {
    const p = generation().createCompiler();
    expect(() => {
      p.push(JSON.stringify({ root }));
      p.getResult();
    }).toThrow();
  });
  it.each([
    '{"root":',
    "{}",
    '{"root":null}',
    '{"root":{},"extra":true}',
    '{"root":{},}',
    '{"root":{},"root":{}}',
    '{"root":{}} trailing',
  ])("rejects malformed framing: %s", (source) => {
    const p = generation().createCompiler();
    expect(() => {
      p.push(source);
      p.getResult();
    }).toThrow();
  });
  it("preserves sibling identity without asking the model for IDs", () => {
    const p = generation().createCompiler();
    p.push(
      JSON.stringify({
        root: {
          type: "Panel",
          props: { title: "twins" },
          children: [
            { type: "Reading / value", props: { value: 1 } },
            { type: "Reading / value", props: { value: 1 } },
          ],
        },
      }),
    );
    expect(p.getResult().elements.e0?.children).toEqual(["e1", "e2"]);
  });
  it("rejects nested fields instead of stripping them", () => {
    const p = createCompactGeneration({
      components: {
        Nested: { props: z.object({ style: z.object({ color: z.string() }) }) },
      },
    }).createCompiler();
    expect(() =>
      p.push(
        JSON.stringify({
          root: {
            type: "Nested",
            props: { style: { color: "red", hidden: 1 } },
          },
        }),
      ),
    ).toThrow(/strip|transform/);
  });
});

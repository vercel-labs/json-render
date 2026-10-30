import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createCompactGeneration } from "./compact-generation";
import {
  encodeCompactFixture,
  compactFixtureSchema,
} from "./compact-test-encoder";
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

describe("positional compact generation", () => {
  it.each([
    [
      "nullable then optional",
      z.string().nullable().optional(),
      { value: "hello" },
    ],
    ["optional then nullable", z.string().optional().nullable(), "hello"],
  ])(
    "preserves omission and null through JSONL for %s",
    async (_, value, present) => {
      const gen = createCompactGeneration({
        components: { Label: { props: z.object({ value }) } },
      });
      for (const [encoded, expected] of [
        [null, {}],
        [{ value: null }, { value: null }],
        [present, { value: "hello" }],
      ]) {
        const source = JSON.stringify({
          state: null,
          root: ["Label", [encoded]],
        });
        const input = new ReadableStream<string>({
          start(controller) {
            for (const character of source) controller.enqueue(character);
            controller.close();
          },
        });
        const reader = input.pipeThrough(gen.createTransform()).getReader();
        const replay = createSpecStreamCompiler<Spec>();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          replay.push(value);
        }
        expect(replay.getResult().elements.e0?.props).toStrictEqual(expected);
      }
    },
  );

  it("publishes props before descendants and preserves omitted versus null props", () => {
    const gen = createCompactGeneration({
      components: {
        Panel: {
          props: z.object({
            extra: z.string().optional(),
            title: z.string(),
            note: z.string().nullish(),
          }),
          slots: ["default", "header"],
        },
        Reading: { props: z.object({ value: z.number().positive() }) },
      },
    });
    const compiler = gen.createCompiler();
    const prefix =
      '{"state":{"entries":[["count",3]]},"root":["Panel",["Overview",null,{"value":null}]';
    for (const character of prefix) compiler.push(character);
    expect(compiler.push("").result.elements.e0?.props).toEqual({
      title: "Overview",
      note: null,
    });
    const suffix =
      ',[["Reading",[{"$state":"/count"}]]],{"header":[["Reading",[2]]]}]}';
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
    const sparse = gen.createCompiler();
    sparse.push('{"state":null,"root":["Panel",["Sparse"],[],{"header":[]}]}');
    expect(sparse.getResult().elements.e0?.props).toEqual({ title: "Sparse" });
    expect(() =>
      gen.createCompiler().push('{"state":null,"root":["Reading",[-1]]}'),
    ).toThrow();
    const missing = gen.createCompiler();
    missing.push('{"root":["Reading",[1]]}');
    expect(() => missing.getResult()).toThrow();
    function audit(value: unknown) {
      if (!value || typeof value !== "object") return;
      const schema = value as Record<string, any>;
      if (schema.type === "object") {
        expect(schema.additionalProperties).toBe(false);
        expect(new Set(schema.required)).toEqual(
          new Set(Object.keys(schema.properties)),
        );
      }
      if (schema.prefixItems) {
        expect(schema.minItems).toBeTypeOf("number");
        expect(schema.maxItems).toBe(schema.prefixItems.length);
        expect(schema.items).toEqual({ type: "null" });
      }
      for (const [key, child] of Object.entries(schema))
        if (!["const", "enum", "default", "examples"].includes(key))
          audit(child);
    }
    audit(gen.jsonSchema);
    const exported = compactFixtureSchema(gen);
    expect(exported.safeParse(JSON.parse(prefix + suffix)).success).toBe(true);
    for (const root of [
      ["Reading", []],
      ["Reading", [1, 2]],
      ["Reading", [1], null, null],
    ])
      expect(exported.safeParse({ state: null, root }).success).toBe(false);
  });

  it("exports empty tuples without empty prefixItems and preserves their bounds", () => {
    const gen = createCompactGeneration({
      components: {
        Empty: { props: z.object({}) },
        Tuples: {
          props: z.object({
            empty: z.tuple([]),
            rest: z.tuple([]).rest(z.string()),
          }),
        },
      },
    });
    function audit(value: unknown) {
      if (!value || typeof value !== "object") return;
      const schema = value as Record<string, any>;
      if (schema.prefixItems)
        expect(schema.prefixItems.length).toBeGreaterThan(0);
      if (schema.maxItems === 0) {
        expect(schema.prefixItems).toBeUndefined();
        expect(schema.minItems).toBe(0);
        expect(schema.items).toEqual({ type: "null" });
      }
      Object.values(schema).forEach(audit);
    }
    audit(gen.jsonSchema);
    for (const [root, props] of [
      [["Empty", []], {}],
      [["Tuples", [[], ["a", "b"]]], { empty: [], rest: ["a", "b"] }],
    ] as const) {
      const compiler = gen.createCompiler();
      compiler.push(JSON.stringify({ state: null, root }));
      expect(compiler.getResult().elements.e0?.props).toEqual(props);
    }
    for (const root of [
      ["Empty", [null]],
      ["Tuples", [[null], []]],
      ["Tuples", [[], [1]]],
    ])
      expect(() =>
        gen.createCompiler().push(JSON.stringify({ state: null, root })),
      ).toThrow();
  });

  it("preserves prototype-safe records and validates their values before publication", () => {
    const records = (value: z.ZodType) =>
      createCompactGeneration({
        components: {
          Records: {
            props: z.object({
              data: z.object({ records: z.array(z.record(z.string(), value)) }),
            }),
          },
        },
      });
    const gen = records(z.number().positive());
    const record = {
      entries: [
        ["__proto__", 1],
        ["constructor", 2],
        ["a/b~c", 3],
      ],
    };
    const root = ["Records", [{ records: [record] }]];
    const source = JSON.stringify({
      state: { entries: [...record.entries, ["nested", record]] },
      root,
    });
    const expected = JSON.parse('{"__proto__":1,"constructor":2,"a/b~c":3}');
    for (const chunks of [[source], [...source]]) {
      const compiler = gen.createCompiler(),
        replay = createSpecStreamCompiler();
      for (const chunk of chunks)
        for (const patch of compiler.push(chunk).newPatches)
          replay.push(JSON.stringify(patch) + "\n");
      const result = compiler.getResult();
      expect(result.state).toEqual({ ...expected, nested: expected });
      expect(result.elements.e0?.props).toEqual({
        data: { records: [expected] },
      });
      expect(Object.getPrototypeOf(result.state)).toBe(Object.prototype);
      expect(replay.getResult()).toEqual(result);
    }
    const withValue = (value: unknown) => [
      "Records",
      [{ records: [{ entries: [["__proto__", value]] }] }],
    ];
    for (const value of [-1, "wrong"])
      expect(() =>
        gen
          .createCompiler()
          .push(JSON.stringify({ state: null, root: withValue(value) })),
      ).toThrow();
    const nested = records(z.object({ count: z.number() }));
    for (const key of ["extra", "__proto__"])
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
    expect(() =>
      records(z.object({ count: z.number().transform((value) => value + 1) })),
    ).toThrow(/Unsupported.*pipe/);
    for (const entries of [
      [
        ["a", 1],
        ["a", 2],
      ],
      [["a"]],
      [["a", 1, 2]],
    ])
      expect(() =>
        gen.createCompiler().push(JSON.stringify({ state: { entries }, root })),
      ).toThrow();
  });

  it("never evaluates refinements from unrelated component types", () => {
    let calls = 0;
    const compiler = createCompactGeneration({
      components: {
        Unused: {
          props: z.object({
            text: z.string().refine(() => {
              calls++;
              return true;
            }),
          }),
        },
        Text: { props: z.object({ text: z.string() }) },
      },
    }).createCompiler();
    compiler.push('{"state":null,"root":["Text",["Hello"]]}');
    expect(compiler.getResult().elements.e0).toEqual({
      type: "Text",
      props: { text: "Hello" },
    });
    expect(calls).toBe(0);
  });

  it("does not run optional prop refinements while preparing the schema", () => {
    let calls = 0;
    const gen = createCompactGeneration({
      components: {
        Text: {
          props: z.object({
            text: z
              .string()
              .optional()
              .refine((value) => {
                calls++;
                if (value === undefined)
                  throw new Error("Explicit text required");
                return true;
              }),
          }),
        },
      },
    });
    expect(calls).toBe(0);
    const compiler = gen.createCompiler();
    compiler.push('{"state":null,"root":["Text",["Hello"]]}');
    expect(compiler.getResult().elements.e0?.props).toEqual({ text: "Hello" });
    expect(calls).toBeGreaterThan(0);
    expect(() =>
      gen.createCompiler().push('{"state":null,"root":["Text",[]]}'),
    ).toThrow("Explicit text required");
  });

  it("validates repeat state at completion in either document field order", async () => {
    const gen = generation();
    const root = {
      type: "Panel",
      props: { title: "Saved" },
      repeat: { statePath: "/saved" },
      children: [{ type: "Reading / value", props: { value: 1 } }],
    };
    for (const stateFirst of [true, false]) {
      const value = JSON.parse(
        encodeCompactFixture(gen, { state: { saved: false }, root }),
      );
      const source = JSON.stringify(
        stateFirst ? value : { root: value.root, state: value.state },
      );
      const stream = new ReadableStream<string>({
        start(c) {
          c.enqueue(source);
          c.close();
        },
      }).pipeThrough(gen.createTransform());
      const drain = async () => {
        const reader = stream.getReader();
        while (!(await reader.read()).done) {}
      };
      await expect(drain()).rejects.toThrow(/array in state/);
    }
    const compiler = gen.createCompiler();
    compiler.push(
      encodeCompactFixture(gen, { state: { saved: [1, 2] }, root }),
    );
    expect(compiler.getResult().state).toEqual({ saved: [1, 2] });
  });

  it("preserves structured expressions and rejects invalid literal siblings", () => {
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
    const source = encodeCompactFixture(gen, { root: { type: "Plot", props } });
    expect(
      compactFixtureSchema(gen).safeParse(JSON.parse(source)).success,
    ).toBe(true);
    const compiler = gen.createCompiler();
    compiler.push(source);
    expect(compiler.getResult().elements.e0?.props).toEqual(props);
    expect(
      resolveElementProps(compiler.getResult().elements.e0!.props, {
        stateModel: { label: "Revenue", color: "blue" },
      }),
    ).toEqual({
      points: [{ label: "Revenue", value: 12 }],
      style: { color: "blue", width: 10 },
    });
    for (const values of [
      [[], props.style],
      [[{ label: { $state: "/label" }, value: -1 }], props.style],
      [props.points, { color: { $state: "/color" }, width: "wide" }],
    ])
      expect(() =>
        gen
          .createCompiler()
          .push(JSON.stringify({ state: null, root: ["Plot", values] })),
      ).toThrow();
  });

  it("preserves optional tuple props through JSONL and rejects absent entries", async () => {
    const props = z.object({
      pair: z.tuple([z.string(), z.number().optional(), z.boolean().nullish()]),
    });
    const gen = createCompactGeneration({ components: { Pair: { props } } });
    async function replay(pair: unknown[]) {
      const source = JSON.stringify({ state: null, root: ["Pair", [pair]] });
      const stream = new ReadableStream<string>({
        start(controller) {
          for (const character of source) controller.enqueue(character);
          controller.close();
        },
      });
      const reader = stream.pipeThrough(gen.createTransform()).getReader();
      const compiler = createSpecStreamCompiler<Spec>();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        compiler.push(value);
        for (const element of Object.values(
          compiler.getResult().elements ?? {},
        ))
          expect(props.safeParse(element.props).success).toBe(true);
      }
      return compiler.getResult().elements.e0?.props;
    }
    await expect(replay(["x"])).resolves.toEqual({ pair: ["x"] });
    await expect(replay(["x", 2, { value: null }])).resolves.toEqual({
      pair: ["x", 2, null],
    });
    for (const pair of [
      ["x", null],
      ["x", null, { value: true }],
      ["x", 2, null],
    ])
      await expect(replay(pair)).rejects.toThrow(
        "Tuple entries must not be absent",
      );
  });

  it("retains recursive, union, tuple, record and nested refinement contracts", () => {
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
    const source = encodeCompactFixture(gen, {
      root: { type: "Data", props: values },
    });
    const compiler = gen.createCompiler();
    compiler.push(source);
    expect(Object.keys(compiler.getResult().elements)).toEqual(["e0"]);
    expect(
      props.parse(
        resolveElementProps(compiler.getResult().elements.e0!.props, {
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
    const invalid = JSON.parse(source);
    invalid.root[1][4] = { start: 5, end: 2 };
    expect(() => gen.createCompiler().push(JSON.stringify(invalid))).toThrow(
      "Invalid nested range",
    );
    invalid.root[1][4] = { start: 1, end: 2 };
    invalid.root[1][1].push(3);
    expect(() => gen.createCompiler().push(JSON.stringify(invalid))).toThrow();
  });

  it("keeps empty containers and whole-props refinements", () => {
    const gen = generation(),
      empty = gen.createCompiler();
    empty.push(
      encodeCompactFixture(gen, {
        root: { type: "Panel", props: { title: "Empty" } },
      }),
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
    expect(() => refined.push('{"state":null,"root":["Range",[5,2]]}')).toThrow(
      "Invalid range",
    );
  });

  it("preserves all metadata and expression forms without treating data arrays as nodes", () => {
    const gen = generation();
    for (const expression of [
      { $state: "/value" },
      { $item: "value" },
      { $index: true },
      { $bindState: "/value" },
      { $bindItem: "value" },
      { $template: "${value}" },
      { $cond: { $state: "/enabled" }, $then: 1, $else: null },
      {
        $computed: "f",
        args: { value: { $state: "/value" }, data: [["Panel", ["fake"]]] },
      },
    ]) {
      const root = {
        ...document.root,
        on: {
          press: {
            action: "setState",
            params: { statePath: "/enabled", value: true },
          },
        },
        watch: { "/value": [{ action: "log", params: { value: expression } }] },
        children: [{ type: "Reading / value", props: { value: expression } }],
      };
      const compiler = gen.createCompiler();
      compiler.push(encodeCompactFixture(gen, { ...document, root }));
      const result = compiler.getResult();
      expect(result.elements.e0?.on).toEqual(root.on);
      expect(result.elements.e0?.watch).toEqual(root.watch);
      expect(result.elements.e0?.visible).toEqual(root.visible);
      expect(result.elements.e1?.props.value).toEqual(expression);
      expect(Object.keys(result.elements)).toHaveLength(3);
    }
  });

  it("keeps short references valid for properties named like schema keywords", () => {
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
      if (typeof object.$ref === "string" && object.$ref.startsWith("#/$defs/"))
        expect(schema.$defs).toHaveProperty(object.$ref.slice(8));
      Object.values(object).forEach(check);
    }
    check(schema);
  });

  it.each([1, 7, 10000])(
    "streams and replays across %i-character boundaries",
    (size) => {
      const gen = generation(),
        compiler = gen.createCompiler(),
        source = encodeCompactFixture(gen, document);
      let rendered = { root: "", elements: {} } as Spec,
        early: Spec | undefined,
        firstAt = 0;
      for (let i = 0; i < source.length; i += size) {
        const { result, newPatches } = compiler.push(source.slice(i, i + size));
        for (const patch of newPatches)
          rendered = applySpecPatch(rendered, patch);
        if (!early && result.elements.e1) {
          early = result;
          firstAt = i;
        }
      }
      const result = compiler.getResult();
      expect(result).toEqual(rendered);
      expect(result.state).toEqual({ enabled: true });
      expect(result.elements.e0?.children).toEqual(["e1"]);
      expect(result.elements.e0?.slots).toEqual({ header: ["e2"] });
      expect(result.elements.e1?.props).toEqual({ value: -2.5, unit: "°C" });
      if (size === 1) {
        expect(firstAt).toBeLessThan(source.length - 1);
        expect(early?.elements.e2).toBeUndefined();
      }
    },
  );

  it("feeds stock JSONL consumers", async () => {
    const gen = generation();
    const source = new ReadableStream<string>({
      start(c) {
        for (const character of encodeCompactFixture(gen, document))
          c.enqueue(character);
        c.close();
      },
    });
    const reader = source.pipeThrough(gen.createTransform()).getReader(),
      stock = createSpecStreamCompiler<Spec>();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      stock.push(value);
    }
    expect(stock.getResult().elements.e1?.props.value).toBe(-2.5);
  });

  it.each([
    ["Reading / value", ["wrong"]],
    ["Reading / value", [2, null, true]],
    ["Unknown", []],
    ["Panel", ["x"], ["missing"], { header: [] }],
    ["Panel", ["x"], [[]], { header: [] }],
    ["Panel", ["x"], [], { invented: [] }],
    ["Panel", ["x"]],
    ["Reading / value", [1], [["Reading / value", [2]]]],
    [
      "Reading / value",
      [1],
      { visible: null, on: null, watch: null, repeat: null, id: "invented" },
    ],
  ])("rejects invalid node %j", (...root) => {
    const compiler = generation().createCompiler();
    expect(() => {
      compiler.push(JSON.stringify({ state: null, root }));
      compiler.getResult();
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
  ])("rejects malformed framing %s", (source) => {
    const compiler = generation().createCompiler();
    expect(() => {
      compiler.push(source);
      compiler.getResult();
    }).toThrow();
  });

  it("preserves sibling identity and rejects nested unknown keys", () => {
    const gen = generation(),
      compiler = gen.createCompiler();
    compiler.push(
      encodeCompactFixture(gen, {
        root: {
          type: "Panel",
          props: { title: "twins" },
          children: [1, 1].map((value) => ({
            type: "Reading / value",
            props: { value },
          })),
        },
      }),
    );
    expect(compiler.getResult().elements.e0?.children).toEqual(["e1", "e2"]);
    const nested = createCompactGeneration({
      components: {
        Nested: { props: z.object({ style: z.object({ color: z.string() }) }) },
      },
    }).createCompiler();
    expect(() =>
      nested.push(
        '{"state":null,"root":["Nested",[{"color":"red","hidden":1}]]}',
      ),
    ).toThrow();
  });
});

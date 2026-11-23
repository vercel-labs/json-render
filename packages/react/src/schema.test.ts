import { defineCatalog, defineSchema } from "@json-render/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { schema } from "./schema";

const catalogData = {
  components: {
    Text: {
      props: z.object({
        text: z.union([z.string(), z.object({ $state: z.string() })]),
      }),
      description: "Show a value",
    },
  },
  actions: {},
};

const spec = {
  root: "text",
  elements: {
    text: { type: "Text", props: { text: { $state: "/name" } }, children: [] },
  },
};

describe("React catalog runtime state", () => {
  it("preserves initial state through validation and the public Zod schema", () => {
    const catalog = defineCatalog(schema, catalogData);
    const state = { name: "Ada", rows: [{ count: 1 }], selection: null };
    const input = { ...spec, state, extra: "outside the schema" };
    const expected = { ...spec, state };

    expect(catalog.validate(input)).toEqual({ success: true, data: expected });
    expect(catalog.zodSchema().parse(input)).toEqual(expected);
    expect(catalog.zodSchema()).toBe(catalog.zodSchema());
    expect(catalog.validate(spec)).toEqual({ success: true, data: spec });
  });

  it("rejects a non-object state", () => {
    const catalog = defineCatalog(schema, catalogData);
    const error = { success: false, error: { issues: [{ path: ["state"] }] } };

    for (const state of [null, []]) {
      const input = { ...spec, state };
      expect(catalog.validate(input)).toMatchObject(error);
      expect(catalog.zodSchema().safeParse(input)).toMatchObject(error);
    }
  });

  it("uses the component definitions from catalog creation for runtime validation", () => {
    const components: Record<string, typeof catalogData.components.Text> = {
      Text: { ...catalogData.components.Text },
    };
    const catalog = defineCatalog(schema, { ...catalogData, components });
    components.Text!.props = components.Text!.props.refine(() => false);
    components.Extra = catalogData.components.Text;
    const input = {
      ...spec,
      elements: { text: { ...spec.elements.text, type: "Extra" } },
      state: { name: "Ada" },
    };

    expect(catalog.validate(input).success).toBe(false);
    expect(catalog.zodSchema().safeParse(input).success).toBe(false);
    expect(catalog.validate({ ...spec, state: input.state }).success).toBe(true);
  });

  it("reads prop schemas once and leaves metadata getters for the prompt", () => {
    const reads = { props: 0, description: 0, example: 0, extra: 0 };
    const data = {
      components: {
        Text: {
          get props() {
            reads.props += 1;
            return catalogData.components.Text.props;
          },
          get description() {
            reads.description += 1;
            return "Component description";
          },
          get example() {
            reads.example += 1;
            return { text: "Example text" };
          },
          get extra() {
            reads.extra += 1;
            return "component metadata";
          },
        },
      },
      actions: {},
      get extra() {
        reads.extra += 1;
        return "catalog metadata";
      },
    };
    const catalog = defineCatalog(schema, data);
    expect(catalog.schema).toBe(schema);
    expect(catalog.data).toBe(data);
    expect(reads).toEqual({ props: 1, description: 0, example: 0, extra: 0 });

    const input = { ...spec, state: { name: "Ada" } };
    expect(catalog.validate(input).success).toBe(true);
    expect(catalog.zodSchema().parse(input)).toEqual(input);
    expect(reads).toEqual({ props: 1, description: 0, example: 0, extra: 0 });

    const prompt = catalog.prompt();
    expect(prompt).toContain("Component description");
    expect(prompt).toContain("Example text");
    expect(reads.description).toBeGreaterThan(0);
    expect(reads.example).toBeGreaterThan(0);
    expect(reads.extra).toBe(0);
  });

  it("preserves the catalog's generation schemas and prompt", () => {
    const baseline = defineCatalog(
      defineSchema(() => schema.definition, schema),
      catalogData,
    );
    const catalog = defineCatalog(schema, catalogData);
    expect(catalog.validate({ ...spec, state: { name: "Ada" } }).success).toBe(true);

    for (const strict of [false, true]) {
      expect(catalog.jsonSchema({ strict })).toEqual(
        baseline.jsonSchema({ strict }),
      );
      expect(catalog.jsonSchema({ strict })).not.toHaveProperty("properties.state");
    }
    expect(catalog.prompt()).toBe(baseline.prompt());
  });

  it("respects a custom schema's state field", () => {
    const custom = defineSchema((s) => ({
      ...schema.definition,
      spec: s.object({ ...schema.definition.spec.inner!, state: s.string() }),
    }));
    const derived = { ...schema, definition: custom.definition };
    const catalog = defineCatalog(custom, catalogData);
    const derivedCatalog = derived.createCatalog(catalogData);
    const input = { ...spec, state: "custom" };

    expect(catalog.validate(input)).toEqual({
      success: true,
      data: input,
    });
    expect(derivedCatalog.schema).toBe(derived);
    expect(derivedCatalog.validate(input)).toEqual(catalog.validate(input));
    expect(derivedCatalog.zodSchema().parse(input)).toEqual(input);
  });
});

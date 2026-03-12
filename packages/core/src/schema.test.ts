import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineSchema, defineCatalog } from "./schema";

// =============================================================================
// Shared test schema (mirrors the React schema shape)
// =============================================================================

const testSchema = defineSchema((s) => ({
  spec: s.object({
    root: s.string(),
    elements: s.record(
      s.object({
        type: s.ref("catalog.components"),
        props: s.propsOf("catalog.components"),
        children: s.array(s.string()),
        visible: s.any(),
      }),
    ),
  }),
  catalog: s.object({
    components: s.map({
      props: s.zod(),
      slots: s.array(s.string()),
      description: s.string(),
      example: s.any(),
    }),
    actions: s.map({
      description: s.string(),
    }),
  }),
}));

// =============================================================================
// defineSchema
// =============================================================================

describe("defineSchema", () => {
  it("creates a schema with spec and catalog definition", () => {
    const schema = defineSchema((s) => ({
      spec: s.object({ root: s.string() }),
      catalog: s.object({ components: s.map({ props: s.zod() }) }),
    }));
    expect(schema.definition).toBeDefined();
    expect(schema.definition.spec.kind).toBe("object");
    expect(schema.definition.catalog.kind).toBe("object");
  });

  it("accepts promptTemplate option", () => {
    const template = () => "custom prompt";
    const schema = defineSchema(
      (s) => ({
        spec: s.object({ root: s.string() }),
        catalog: s.object({ components: s.map({ props: s.zod() }) }),
      }),
      { promptTemplate: template },
    );
    expect(schema.promptTemplate).toBe(template);
  });

  it("accepts defaultRules option", () => {
    const schema = defineSchema(
      (s) => ({
        spec: s.object({ root: s.string() }),
        catalog: s.object({ components: s.map({ props: s.zod() }) }),
      }),
      { defaultRules: ["Rule A", "Rule B"] },
    );
    expect(schema.defaultRules).toEqual(["Rule A", "Rule B"]);
  });

  it("exposes createCatalog method", () => {
    const schema = defineSchema((s) => ({
      spec: s.object({ root: s.string() }),
      catalog: s.object({ components: s.map({ props: s.zod() }) }),
    }));
    expect(typeof schema.createCatalog).toBe("function");
  });
});

// =============================================================================
// defineCatalog / createCatalog
// =============================================================================

describe("defineCatalog", () => {
  it("creates catalog with componentNames and actionNames", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "Display text",
          slots: [],
        },
        Button: {
          props: z.object({ label: z.string() }),
          description: "A clickable button",
          slots: [],
        },
      },
      actions: {
        navigate: { description: "Navigate to URL" },
        submit: { description: "Submit form" },
      },
    });

    expect(catalog.componentNames).toEqual(["Text", "Button"]);
    expect(catalog.actionNames).toEqual(["navigate", "submit"]);
  });

  it("handles empty components and actions", () => {
    const catalog = defineCatalog(testSchema, {
      components: {},
      actions: {},
    });
    expect(catalog.componentNames).toEqual([]);
    expect(catalog.actionNames).toEqual([]);
  });

  it("is equivalent to schema.createCatalog", () => {
    const catalogData = {
      components: {
        Card: {
          props: z.object({ title: z.string() }),
          description: "A card",
          slots: ["default"],
        },
      },
      actions: {},
    };

    const a = defineCatalog(testSchema, catalogData);
    const b = testSchema.createCatalog(catalogData);

    expect(a.componentNames).toEqual(b.componentNames);
    expect(a.actionNames).toEqual(b.actionNames);
    expect(a.data).toBe(b.data);
  });

  it("exposes the schema on the catalog", () => {
    const catalog = defineCatalog(testSchema, {
      components: {},
      actions: {},
    });
    expect(catalog.schema).toBe(testSchema);
  });

  it("exposes catalog data", () => {
    const data = {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    };
    const catalog = defineCatalog(testSchema, data);
    expect(catalog.data).toBe(data);
  });
});

// =============================================================================
// catalog.prompt()
// =============================================================================

describe("catalog.prompt", () => {
  it("includes AVAILABLE COMPONENTS section", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Card: {
          props: z.object({
            title: z.string(),
            names: z.array(z.string()),
            users: z.array(z.object({ name: z.string(), age: z.number() })),
          }),
          description: "A card container",
          slots: ["default"],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain("AVAILABLE COMPONENTS");
    expect(prompt).toContain("Card");
    expect(prompt).toContain("A card container");
    expect(prompt).toContain("title: string");
    expect(prompt).toContain("names: Array<string>");
    expect(prompt).toContain("users: Array<{ name: string, age: number }>");
  });

  it("includes AVAILABLE ACTIONS when present", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {
        navigate: { description: "Navigate to URL" },
      },
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain("AVAILABLE ACTIONS");
    expect(prompt).toContain("navigate");
    expect(prompt).toContain("Navigate to URL");
  });

  it("omits AVAILABLE ACTIONS when there are none", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    expect(prompt).not.toContain("AVAILABLE ACTIONS");
  });

  it("uses custom system message when provided", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({}),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt({ system: "You are a dashboard builder." });
    expect(prompt).toContain("You are a dashboard builder.");
    expect(prompt).not.toContain("You are a UI generator that outputs JSON.");
  });

  it("appends customRules to prompt", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({}),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt({
      customRules: ["Always use Card as root", "Keep UIs simple"],
    });
    expect(prompt).toContain("Always use Card as root");
    expect(prompt).toContain("Keep UIs simple");
  });

  it("generates inline mode prompt when mode is inline", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({}),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt({ mode: "inline" });
    expect(prompt).toContain("```spec");
    expect(prompt).toContain("conversationally");
    expect(prompt).toContain("text + JSONL");
  });

  it("generates standalone mode prompt by default", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({}),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain("Output ONLY JSONL patches");
    expect(prompt).not.toContain("conversationally");
  });

  it("accepts deprecated 'chat' as alias for 'inline'", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({}),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const inlinePrompt = catalog.prompt({ mode: "inline" });
    const chatPrompt = catalog.prompt({ mode: "chat" });
    expect(chatPrompt).toEqual(inlinePrompt);
  });

  it("accepts deprecated 'generate' as alias for 'standalone'", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({}),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const standalonePrompt = catalog.prompt({ mode: "standalone" });
    const generatePrompt = catalog.prompt({ mode: "generate" });
    expect(generatePrompt).toEqual(standalonePrompt);
  });

  it("uses actual catalog component names in examples", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        MyBox: {
          props: z.object({ padding: z.number() }),
          description: "A box",
          slots: ["default"],
        },
        MyLabel: {
          props: z.object({ text: z.string() }),
          description: "A label",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain('"type":"MyBox"');
    expect(prompt).toContain('"type":"MyLabel"');
  });

  it("does not include hardcoded component names not in catalog", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    const hardcoded = ["Stack", "Grid", "Heading", "Column", "Pressable"];
    for (const comp of hardcoded) {
      expect(prompt).not.toContain(`"type":"${comp}"`);
    }
  });

  it("generates example props from Zod schemas", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Widget: {
          props: z.object({
            title: z.string(),
            count: z.number(),
            active: z.boolean(),
            variant: z.enum(["primary", "secondary"]),
          }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain('"title":"example"');
    expect(prompt).toContain('"count":0');
    expect(prompt).toContain('"active":true');
    expect(prompt).toContain('"variant":"primary"');
  });

  it("uses explicit example over Zod-generated values", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Heading: {
          props: z.object({
            text: z.string(),
            level: z.enum(["h1", "h2", "h3"]),
          }),
          description: "A heading",
          slots: [],
          example: { text: "Welcome", level: "h1" },
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain('"text":"Welcome"');
    expect(prompt).toContain('"level":"h1"');
  });

  it("uses custom promptTemplate when schema has one", () => {
    const customSchema = defineSchema(
      (s) => ({
        spec: s.object({ root: s.string() }),
        catalog: s.object({
          components: s.map({ props: s.zod(), description: s.string() }),
        }),
      }),
      {
        promptTemplate: (ctx) =>
          `Custom prompt with ${ctx.componentNames.length} components: ${ctx.componentNames.join(", ")}`,
      },
    );
    const catalog = customSchema.createCatalog({
      components: {
        Alpha: { props: z.object({}), description: "A" },
        Beta: { props: z.object({}), description: "B" },
      },
    });
    const prompt = catalog.prompt();
    expect(prompt).toBe("Custom prompt with 2 components: Alpha, Beta");
  });

  it("includes defaultRules from schema in the RULES section", () => {
    const schemaWithRules = defineSchema(
      (s) => ({
        spec: s.object({
          root: s.string(),
          elements: s.record(
            s.object({
              type: s.ref("catalog.components"),
              props: s.any(),
              children: s.array(s.string()),
            }),
          ),
        }),
        catalog: s.object({
          components: s.map({ props: s.zod(), description: s.string() }),
        }),
      }),
      { defaultRules: ["Schema default rule one", "Schema default rule two"] },
    );
    const catalog = schemaWithRules.createCatalog({
      components: {
        Text: { props: z.object({}), description: "" },
      },
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain("Schema default rule one");
    expect(prompt).toContain("Schema default rule two");
  });

  it("contains sections for state, repeat, actions, visibility, and dynamic props", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain("INITIAL STATE:");
    expect(prompt).toContain("DYNAMIC LISTS (repeat field):");
    expect(prompt).toContain("EVENTS (the `on` field):");
    expect(prompt).toContain("VISIBILITY CONDITIONS:");
    expect(prompt).toContain("DYNAMIC PROPS:");
    expect(prompt).toContain("RULES:");
  });
});

// =============================================================================
// catalog.validate()
// =============================================================================

describe("catalog.validate", () => {
  const catalog = defineCatalog(testSchema, {
    components: {
      Text: {
        props: z.object({ content: z.string() }),
        description: "",
        slots: [],
      },
      Card: {
        props: z.object({ title: z.string() }),
        description: "",
        slots: ["default"],
      },
    },
    actions: {},
  });

  it("validates a valid spec", () => {
    const spec = {
      root: "card-1",
      elements: {
        "card-1": {
          type: "Card",
          props: { title: "Hello" },
          children: ["text-1"],
        },
        "text-1": {
          type: "Text",
          props: { content: "World" },
          children: [],
        },
      },
    };
    const result = catalog.validate(spec);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(spec);
  });

  it("rejects spec with wrong root type", () => {
    const result = catalog.validate({ root: 123, elements: {} });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects spec with missing root", () => {
    const result = catalog.validate({ elements: {} });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects spec with invalid component type", () => {
    const result = catalog.validate({
      root: "x",
      elements: {
        x: { type: "NonExistent", props: {}, children: [] },
      },
    });
    expect(result.success).toBe(false);
  });

  it("returns data on success", () => {
    const spec = {
      root: "t",
      elements: {
        t: { type: "Text", props: { content: "hi" }, children: [] },
      },
    };
    const result = catalog.validate(spec);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.root).toBe("t");
  });
});

// =============================================================================
// catalog.jsonSchema()
// =============================================================================

describe("catalog.jsonSchema", () => {
  it("returns a JSON Schema object", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const jsonSchema = catalog.jsonSchema();
    expect(jsonSchema).toBeDefined();
    expect(typeof jsonSchema).toBe("object");
  });

  it("returns a non-empty object for a catalog with components", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const jsonSchema = catalog.jsonSchema();
    expect(jsonSchema).toBeDefined();
    expect(jsonSchema).not.toBeNull();
    expect(typeof jsonSchema).toBe("object");
  });

  describe("strict mode (LLM structured output compatible)", () => {
    function hasNoPropertyNames(obj: unknown): boolean {
      if (typeof obj !== "object" || obj === null) return true;
      if ("propertyNames" in obj) return false;
      return Object.values(obj).every(hasNoPropertyNames);
    }

    function allObjectsHaveAdditionalPropertiesFalse(obj: unknown): boolean {
      if (typeof obj !== "object" || obj === null) return true;
      const record = obj as Record<string, unknown>;
      if (record.type === "object") {
        if (record.additionalProperties !== false) return false;
      }
      return Object.values(record).every(
        allObjectsHaveAdditionalPropertiesFalse,
      );
    }

    function allObjectPropertiesRequired(obj: unknown): boolean {
      if (typeof obj !== "object" || obj === null) return true;
      const record = obj as Record<string, unknown>;
      if (
        record.type === "object" &&
        record.properties &&
        typeof record.properties === "object"
      ) {
        const propKeys = Object.keys(record.properties);
        const required = (record.required as string[]) ?? [];
        if (!propKeys.every((k) => required.includes(k))) return false;
      }
      return Object.values(record).every(allObjectPropertiesRequired);
    }

    it("sets additionalProperties: false on all nested objects", () => {
      const catalog = defineCatalog(testSchema, {
        components: {
          Card: {
            props: z.object({
              title: z.string(),
              subtitle: z.string().optional(),
            }),
            description: "",
            slots: [],
          },
        },
        actions: {},
      });
      const schema = catalog.jsonSchema({ strict: true });
      expect(allObjectsHaveAdditionalPropertiesFalse(schema)).toBe(true);
    });

    it("does not emit propertyNames", () => {
      const catalog = defineCatalog(testSchema, {
        components: {
          Text: {
            props: z.object({ content: z.string() }),
            description: "",
            slots: [],
          },
        },
        actions: {},
      });
      const schema = catalog.jsonSchema({ strict: true });
      expect(hasNoPropertyNames(schema)).toBe(true);
    });

    it("lists all properties in required (optional uses nullable)", () => {
      const catalog = defineCatalog(testSchema, {
        components: {
          Card: {
            props: z.object({
              title: z.string(),
              subtitle: z.string().optional(),
            }),
            description: "",
            slots: [],
          },
        },
        actions: {},
      });
      const schema = catalog.jsonSchema({ strict: true });
      expect(allObjectPropertiesRequired(schema)).toBe(true);
    });

    it("converts record types without additionalProperties schema value", () => {
      const catalog = defineCatalog(testSchema, {
        components: {
          Text: {
            props: z.object({ content: z.string() }),
            description: "",
            slots: [],
          },
        },
        actions: {},
      });
      const schema = catalog.jsonSchema({
        strict: true,
      }) as Record<string, unknown>;

      // Walk the schema and ensure no additionalProperties is set to a non-false value
      function noAdditionalPropertiesSchema(obj: unknown): boolean {
        if (typeof obj !== "object" || obj === null) return true;
        const rec = obj as Record<string, unknown>;
        if (
          "additionalProperties" in rec &&
          rec.additionalProperties !== false
        ) {
          return false;
        }
        return Object.values(rec).every(noAdditionalPropertiesSchema);
      }
      expect(noAdditionalPropertiesSchema(schema)).toBe(true);
    });

    it("wraps optional properties with anyOf nullable", () => {
      // Use a schema where propsOf resolves to a single component's props
      // (no record wrapper around the props) so the optional anyOf handling
      // is directly visible in the JSON Schema output.
      const flatSchema = defineSchema((s) => ({
        spec: s.object({
          component: s.object({
            type: s.ref("catalog.components"),
            props: s.propsOf("catalog.components"),
          }),
        }),
        catalog: s.object({
          components: s.map({
            props: s.zod(),
            description: s.string(),
          }),
        }),
      }));

      const catalog = defineCatalog(flatSchema, {
        components: {
          Card: {
            props: z.object({
              heading: z.string(),
              caption: z.string().optional(),
            }),
            description: "",
          },
        },
      });

      const schema = catalog.jsonSchema({ strict: true }) as {
        properties: {
          component: {
            properties: { props: Record<string, unknown> };
          };
        };
      };

      const propsSchema = schema.properties.component.properties.props;

      // caption is optional – in strict mode it must be in `required`
      // and wrapped in anyOf with null
      const captionSchema = (
        propsSchema as {
          properties: { caption: Record<string, unknown> };
        }
      ).properties.caption;
      expect(captionSchema).toEqual({
        anyOf: [{ type: "string" }, { type: "null" }],
      });

      const propsRequired = (propsSchema as { required: string[] }).required;
      expect(propsRequired).toContain("heading");
      expect(propsRequired).toContain("caption");
    });

    it("does not affect default (non-strict) output", () => {
      const catalog = defineCatalog(testSchema, {
        components: {
          Text: {
            props: z.object({ content: z.string() }),
            description: "",
            slots: [],
          },
        },
        actions: {},
      });
      const defaultSchema = catalog.jsonSchema();
      const defaultSchema2 = catalog.jsonSchema({ strict: false });
      expect(defaultSchema).toEqual(defaultSchema2);
    });
  });
});

// =============================================================================
// catalog.zodSchema()
// =============================================================================

describe("catalog.zodSchema", () => {
  it("returns a Zod schema that validates valid specs", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({ content: z.string() }),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const zodSchema = catalog.zodSchema();
    const result = zodSchema.safeParse({
      root: "t",
      elements: {
        t: { type: "Text", props: { content: "hi" }, children: [] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("returns a Zod schema that rejects invalid specs", () => {
    const catalog = defineCatalog(testSchema, {
      components: {
        Text: {
          props: z.object({}),
          description: "",
          slots: [],
        },
      },
      actions: {},
    });
    const zodSchema = catalog.zodSchema();
    const result = zodSchema.safeParse({ root: 42 });
    expect(result.success).toBe(false);
  });
});

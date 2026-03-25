import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineCatalog } from "@json-render/core";
import { schema } from "./schema";

// =============================================================================
// schema structure
// =============================================================================

describe("schema", () => {
  it("has spec and catalog definitions", () => {
    expect(schema.definition).toBeDefined();
    expect(schema.definition.spec.kind).toBe("object");
    expect(schema.definition.catalog.kind).toBe("object");
  });

  it("has defaultRules", () => {
    expect(schema.defaultRules).toBeDefined();
    expect(Array.isArray(schema.defaultRules)).toBe(true);
    expect(schema.defaultRules!.length).toBeGreaterThan(0);
  });

  it("includes Astro-specific static HTML rule", () => {
    const rules = schema.defaultRules ?? [];
    const hasStaticRule = rules.some(
      (r) => r.includes("static HTML") && r.includes("Astro island"),
    );
    expect(hasStaticRule).toBe(true);
  });

  it("exposes createCatalog method", () => {
    expect(typeof schema.createCatalog).toBe("function");
  });

  it("includes element integrity rules", () => {
    const rules = schema.defaultRules ?? [];
    const hasIntegrityRule = rules.some((r) => r.includes("INTEGRITY CHECK"));
    expect(hasIntegrityRule).toBe(true);
  });

  it("includes semantic HTML rules", () => {
    const rules = schema.defaultRules ?? [];
    const hasSemanticRule = rules.some((r) => r.includes("semantic HTML"));
    expect(hasSemanticRule).toBe(true);
  });

  it("includes repeat field rules", () => {
    const rules = schema.defaultRules ?? [];
    const hasRepeatRule = rules.some((r) => r.includes("repeat"));
    expect(hasRepeatRule).toBe(true);
  });
});

// =============================================================================
// defineCatalog with Astro schema
// =============================================================================

describe("defineCatalog (astro)", () => {
  it("creates catalog with componentNames", () => {
    const catalog = defineCatalog(schema, {
      components: {
        Card: {
          props: z.object({ title: z.string() }),
          description: "A card container",
        },
        Text: {
          props: z.object({ content: z.string() }),
          description: "Body text",
        },
      },
    });

    expect(catalog.componentNames).toEqual(["Card", "Text"]);
  });

  it("has no actionNames (Astro is static)", () => {
    const catalog = defineCatalog(schema, {
      components: {
        Card: {
          props: z.object({ title: z.string() }),
          description: "A card",
        },
      },
    });

    // Astro schema doesn't define actions in the catalog
    expect(catalog.actionNames).toEqual([]);
  });

  it("handles empty components", () => {
    const catalog = defineCatalog(schema, {
      components: {},
    });
    expect(catalog.componentNames).toEqual([]);
  });

  it("exposes the schema on the catalog", () => {
    const catalog = defineCatalog(schema, {
      components: {},
    });
    expect(catalog.schema).toBe(schema);
  });

  it("exposes catalog data", () => {
    const data = {
      components: {
        Badge: {
          props: z.object({ label: z.string() }),
          description: "A badge",
        },
      },
    };
    const catalog = defineCatalog(schema, data);
    expect(catalog.data).toBe(data);
  });

  it("is equivalent to schema.createCatalog", () => {
    const catalogData = {
      components: {
        Card: {
          props: z.object({ title: z.string() }),
          description: "A card",
          slots: ["default" as const],
        },
      },
    };

    const a = defineCatalog(schema, catalogData);
    const b = schema.createCatalog(catalogData);

    expect(a.componentNames).toEqual(b.componentNames);
    expect(a.data).toBe(b.data);
  });

  it("accepts components with slots", () => {
    const catalog = defineCatalog(schema, {
      components: {
        Layout: {
          props: z.object({}),
          description: "Layout with named slots",
          slots: ["header", "footer", "default"],
        },
      },
    });
    expect(catalog.componentNames).toEqual(["Layout"]);
    expect(catalog.data.components.Layout.slots).toEqual([
      "header",
      "footer",
      "default",
    ]);
  });
});

// =============================================================================
// catalog.prompt()
// =============================================================================

describe("catalog.prompt (astro)", () => {
  const catalog = defineCatalog(schema, {
    components: {
      Card: {
        props: z.object({ title: z.string(), subtitle: z.string().optional() }),
        description: "A card container",
        slots: ["default"],
      },
      Text: {
        props: z.object({ content: z.string() }),
        description: "A text block",
      },
    },
  });

  it("includes AVAILABLE COMPONENTS section", () => {
    const prompt = catalog.prompt();
    expect(prompt).toContain("AVAILABLE COMPONENTS");
    expect(prompt).toContain("Card");
    expect(prompt).toContain("Text");
    expect(prompt).toContain("A card container");
  });

  it("includes prop type signatures", () => {
    const prompt = catalog.prompt();
    expect(prompt).toContain("title: string");
    expect(prompt).toContain("content: string");
  });

  it("includes Astro-specific defaultRules", () => {
    const prompt = catalog.prompt();
    expect(prompt).toContain("static HTML");
    expect(prompt).toContain("Astro island");
  });

  it("does not include AVAILABLE ACTIONS (Astro has none)", () => {
    const prompt = catalog.prompt();
    expect(prompt).not.toContain("AVAILABLE ACTIONS");
  });

  it("uses custom system message when provided", () => {
    const prompt = catalog.prompt({ system: "You build Astro pages." });
    expect(prompt).toContain("You build Astro pages.");
  });

  it("appends customRules to prompt", () => {
    const prompt = catalog.prompt({
      customRules: ["Always use semantic HTML", "Keep it accessible"],
    });
    expect(prompt).toContain("Always use semantic HTML");
    expect(prompt).toContain("Keep it accessible");
  });

  it("generates example props from Zod schemas", () => {
    const prompt = catalog.prompt();
    expect(prompt).toContain('"title":"example"');
    expect(prompt).toContain('"content":"example"');
  });

  it("uses explicit example over Zod-generated values", () => {
    const catalogWithExample = defineCatalog(schema, {
      components: {
        Heading: {
          props: z.object({ text: z.string(), level: z.enum(["h1", "h2"]) }),
          description: "A heading",
          example: { text: "Welcome", level: "h1" },
        },
      },
    });
    const prompt = catalogWithExample.prompt();
    expect(prompt).toContain('"text":"Welcome"');
    expect(prompt).toContain('"level":"h1"');
  });

  it("uses actual catalog component names in examples", () => {
    const prompt = catalog.prompt();
    expect(prompt).toContain('"type":"Card"');
    expect(prompt).toContain('"type":"Text"');
  });

  it("does not include hardcoded component names not in catalog", () => {
    const prompt = catalog.prompt();
    const hardcoded = ["Stack", "Grid", "Heading", "Column", "Pressable"];
    for (const comp of hardcoded) {
      expect(prompt).not.toContain(`"type":"${comp}"`);
    }
  });

  it("generates standalone mode prompt by default", () => {
    const prompt = catalog.prompt();
    expect(prompt).toContain("Output ONLY JSONL patches");
    expect(prompt).not.toContain("conversationally");
  });

  it("generates inline mode prompt when mode is inline", () => {
    const prompt = catalog.prompt({ mode: "inline" });
    expect(prompt).toContain("conversationally");
  });

  it("contains sections for state, repeat, and visibility", () => {
    const prompt = catalog.prompt();
    expect(prompt).toContain("INITIAL STATE:");
    expect(prompt).toContain("DYNAMIC LISTS (repeat field):");
    expect(prompt).toContain("VISIBILITY CONDITIONS:");
    expect(prompt).toContain("DYNAMIC PROPS:");
    expect(prompt).toContain("RULES:");
  });
});

// =============================================================================
// catalog.validate()
// =============================================================================

describe("catalog.validate (astro)", () => {
  const catalog = defineCatalog(schema, {
    components: {
      Card: {
        props: z.object({ title: z.string() }),
        description: "A card",
      },
      Text: {
        props: z.object({ content: z.string() }),
        description: "Text",
      },
    },
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
  });

  it("rejects spec with missing root", () => {
    const result = catalog.validate({ elements: {} });
    expect(result.success).toBe(false);
  });

  it("rejects spec with invalid component type", () => {
    const result = catalog.validate({
      root: "x",
      elements: {
        x: { type: "Unknown", props: {}, children: [] },
      },
    });
    expect(result.success).toBe(false);
  });

  it("validates spec with visibility conditions", () => {
    const result = catalog.validate({
      root: "card-1",
      elements: {
        "card-1": {
          type: "Card",
          props: { title: "Hello" },
          children: [],
          visible: { $state: "/showCard" },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates spec with nested children", () => {
    const result = catalog.validate({
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Parent" },
          children: ["nested"],
        },
        nested: {
          type: "Card",
          props: { title: "Child" },
          children: ["leaf"],
        },
        leaf: {
          type: "Text",
          props: { content: "Leaf" },
          children: [],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates spec with empty elements", () => {
    const result = catalog.validate({
      root: "t",
      elements: {
        t: { type: "Text", props: { content: "" }, children: [] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("returns error details on failure", () => {
    const result = catalog.validate({ root: 123, elements: {} });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// =============================================================================
// catalog.jsonSchema()
// =============================================================================

describe("catalog.jsonSchema (astro)", () => {
  const catalog = defineCatalog(schema, {
    components: {
      Text: {
        props: z.object({ content: z.string() }),
        description: "Text",
      },
    },
  });

  it("returns a JSON Schema object", () => {
    const jsonSchema = catalog.jsonSchema();
    expect(jsonSchema).toBeDefined();
    expect(typeof jsonSchema).toBe("object");
  });

  it("produces strict-mode schema with additionalProperties: false", () => {
    const strict = catalog.jsonSchema({ strict: true });

    function allObjectsHaveNoAdditionalProps(obj: unknown): boolean {
      if (typeof obj !== "object" || obj === null) return true;
      const record = obj as Record<string, unknown>;
      if (record.type === "object" && record.additionalProperties !== false) {
        return false;
      }
      return Object.values(record).every(allObjectsHaveNoAdditionalProps);
    }

    expect(allObjectsHaveNoAdditionalProps(strict)).toBe(true);
  });
});

// =============================================================================
// catalog.zodSchema()
// =============================================================================

describe("catalog.zodSchema (astro)", () => {
  const catalog = defineCatalog(schema, {
    components: {
      Text: {
        props: z.object({ content: z.string() }),
        description: "Text",
      },
    },
  });

  it("validates valid specs", () => {
    const zodSchema = catalog.zodSchema();
    const result = zodSchema.safeParse({
      root: "t",
      elements: {
        t: { type: "Text", props: { content: "hi" }, children: [] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid specs", () => {
    const zodSchema = catalog.zodSchema();
    const result = zodSchema.safeParse({ root: 42 });
    expect(result.success).toBe(false);
  });

  it("rejects spec with unknown component type", () => {
    const zodSchema = catalog.zodSchema();
    const result = zodSchema.safeParse({
      root: "x",
      elements: {
        x: { type: "Unknown", props: {}, children: [] },
      },
    });
    expect(result.success).toBe(false);
  });
});

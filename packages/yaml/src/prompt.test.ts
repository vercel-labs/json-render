import { describe, it, expect } from "vitest";
import { defineSchema, defineCatalog } from "@json-render/core";
import { z } from "zod";
import { yamlPrompt } from "./prompt";

const testSchema = defineSchema(
  (s) => ({
    spec: s.object({
      root: s.string(),
      elements: s.record(
        s.object({
          type: s.ref("catalog.components"),
          props: s.propsOf("catalog.components"),
          children: s.array(s.string()),
        }),
      ),
    }),
    catalog: s.object({
      components: s.map({
        props: s.zod(),
        description: s.string(),
      }),
      actions: s.map({
        description: s.string(),
      }),
    }),
  }),
  {
    builtInActions: [{ name: "setState", description: "Set a state value" }],
  },
);

const testCatalog = defineCatalog(testSchema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      description: "A card container",
    },
    Text: {
      props: z.object({ content: z.string() }),
      description: "Display text",
    },
  },
  actions: {
    refresh: { description: "Refresh data" },
  },
});

describe("yamlPrompt", () => {
  it("generates a prompt string", () => {
    const prompt = yamlPrompt(testCatalog);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("includes YAML format instructions", () => {
    const prompt = yamlPrompt(testCatalog);
    expect(prompt).toContain("YAML");
    expect(prompt).toContain("yaml-spec");
  });

  it("includes component names from the catalog", () => {
    const prompt = yamlPrompt(testCatalog);
    expect(prompt).toContain("Card");
    expect(prompt).toContain("Text");
  });

  it("includes action names", () => {
    const prompt = yamlPrompt(testCatalog);
    expect(prompt).toContain("refresh");
    expect(prompt).toContain("setState");
  });

  it("includes yaml-edit instructions", () => {
    const prompt = yamlPrompt(testCatalog);
    expect(prompt).toContain("yaml-edit");
    expect(prompt).toContain("deep merge");
  });

  it("includes a YAML example", () => {
    const prompt = yamlPrompt(testCatalog);
    expect(prompt).toContain("root: main");
    expect(prompt).toContain("elements:");
    expect(prompt).toContain("type: Card");
  });

  it("respects mode: inline", () => {
    const prompt = yamlPrompt(testCatalog, { mode: "inline" });
    expect(prompt).toContain("respond conversationally");
  });

  it("respects mode: standalone", () => {
    const prompt = yamlPrompt(testCatalog, { mode: "standalone" });
    expect(prompt).toContain("Output ONLY");
  });

  it("appends custom rules", () => {
    const prompt = yamlPrompt(testCatalog, {
      customRules: ["Always use dark theme colors"],
    });
    expect(prompt).toContain("Always use dark theme colors");
  });

  it("uses custom system message", () => {
    const prompt = yamlPrompt(testCatalog, {
      system: "You are a dashboard builder.",
    });
    expect(prompt).toContain("You are a dashboard builder.");
  });
});

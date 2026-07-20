import { describe, expect, it } from "vitest";
import { z } from "zod";

import { schema } from "./schema";

function buildPrompt(): string {
  const catalog = schema.createCatalog({
    components: {
      Card: {
        props: z.object({ title: z.string() }),
        description: "A card container",
        slots: ["default"],
      },
    },
    actions: {},
  });
  return catalog.prompt();
}

describe("schema", () => {
  it("exposes createCatalog", () => {
    expect(typeof schema.createCatalog).toBe("function");
  });

  it("declares the four built-in actions including validateForm (B2)", () => {
    const prompt = buildPrompt();
    for (const action of [
      "setState",
      "pushState",
      "removeState",
      "validateForm",
    ]) {
      expect(prompt).toContain(action);
    }
  });

  it("includes the filtered-lists ($item repeat) default rule (M6)", () => {
    const prompt = buildPrompt();
    expect(prompt).toContain("FILTERED LISTS");
  });

  it("includes the required-children-array default rule (M6)", () => {
    const prompt = buildPrompt();
    expect(prompt).toContain("REQUIRED FIELDS");
  });
});

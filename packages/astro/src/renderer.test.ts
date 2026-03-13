import { describe, it, expect } from "vitest";
import { defineRegistry } from "./renderer";

describe("defineRegistry", () => {
  it("returns a registry object", () => {
    const mockCard = (() => {}) as any;
    const mockText = (() => {}) as any;

    const { registry } = defineRegistry(null as any, {
      components: { Card: mockCard, Text: mockText },
    });

    expect(registry).toBeDefined();
    expect(typeof registry).toBe("object");
  });

  it("maps component names to their Astro component factories", () => {
    const mockCard = (() => {}) as any;
    const mockText = (() => {}) as any;

    const { registry } = defineRegistry(null as any, {
      components: { Card: mockCard, Text: mockText },
    });

    expect(registry.Card).toBe(mockCard);
    expect(registry.Text).toBe(mockText);
  });

  it("handles empty components", () => {
    const { registry } = defineRegistry(null as any, {
      components: {} as any,
    });

    expect(registry).toEqual({});
  });

  it("handles single component", () => {
    const mockHero = (() => {}) as any;

    const { registry } = defineRegistry(null as any, {
      components: { Hero: mockHero } as any,
    });

    expect(registry.Hero).toBe(mockHero);
    expect(Object.keys(registry)).toHaveLength(1);
  });

  it("returns DefineRegistryResult shape", () => {
    const result = defineRegistry(null as any, { components: {} as any });
    expect(result).toHaveProperty("registry");
    expect(Object.keys(result)).toEqual(["registry"]);
  });
});

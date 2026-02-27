import { describe, expect, it } from "vitest";
import { shadcnComponentDefinitions } from "../src/catalog.js";
import { shadcnComponents } from "../src/components.js";

describe("@json-render/shadcn-svelte exports", () => {
  it("exports 36 catalog definitions", () => {
    expect(Object.keys(shadcnComponentDefinitions)).toHaveLength(36);
  });

  it("exports 36 component implementations", () => {
    expect(Object.keys(shadcnComponents)).toHaveLength(36);
  });
});

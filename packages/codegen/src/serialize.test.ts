import { describe, expect, it } from "vitest";
import { serializePropValue } from "./serialize";

describe("serializePropValue", () => {
  it("quotes non-identifier object keys", () => {
    expect(serializePropValue({ "data-testid": "widget" })).toEqual({
      value: '{ "data-testid": "widget" }',
      needsBraces: true,
    });
  });

  it("keeps simple identifier keys readable", () => {
    expect(serializePropValue({ name: "widget" })).toEqual({
      value: '{ name: "widget" }',
      needsBraces: true,
    });
  });

  it("preserves an own __proto__ property", () => {
    const value = JSON.parse('{"__proto__":"data"}');

    expect(serializePropValue(value)).toEqual({
      value: '{ ["__proto__"]: "data" }',
      needsBraces: true,
    });
  });
});

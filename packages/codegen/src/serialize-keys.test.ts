import { describe, expect, it } from "vitest";
import { serializePropValue } from "./serialize";

function evaluate(value: unknown): Record<string, unknown> {
  const { value: code } = serializePropValue(value);
  return new Function(`return (${code});`)() as Record<string, unknown>;
}

describe("serializePropValue object keys", () => {
  it("quotes non-identifier keys so the output evaluates", () => {
    const result = evaluate({ "data-testid": "widget", "a b": 1, "1x": 2 });

    expect(result).toEqual({ "data-testid": "widget", "a b": 1, "1x": 2 });
  });

  it("keeps identifier keys unquoted", () => {
    expect(serializePropValue({ name: "widget", $a: 1 }).value).toBe(
      '{ name: "widget", $a: 1 }',
    );
  });

  it("keeps __proto__ as an own property without changing the prototype", () => {
    const result = evaluate(JSON.parse('{"__proto__":{"x":1},"ok":true}'));

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getOwnPropertyNames(result)).toEqual(["__proto__", "ok"]);
    expect(Object.getOwnPropertyDescriptor(result, "__proto__")?.value).toEqual(
      { x: 1 },
    );
  });

  it("quotes keys in nested objects", () => {
    const result = evaluate({ outer: { "inner-key": "v" } });

    expect(result).toEqual({ outer: { "inner-key": "v" } });
  });
});

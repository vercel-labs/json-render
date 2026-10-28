import { z } from "zod";
import { createCompactGeneration } from "./compact-generation";

type Node = {
  type: string;
  props: Record<string, unknown>;
  children?: Node[];
  slots?: Record<string, Node[]>;
  visible?: unknown;
  on?: unknown;
  watch?: unknown;
  repeat?: unknown;
};
type JSONSchema = Record<string, any>;

export function encodeCompactFixture(
  generation: ReturnType<typeof createCompactGeneration>,
  document: { state?: unknown; root: Node },
): string {
  const schema = generation.jsonSchema as JSONSchema;
  const catalog = JSON.parse(
    generation.prompt.split("Component catalog:\n")[1]!.split("\nActions:")[0]!,
  );
  function resolve(value: JSONSchema): JSONSchema {
    return value.$ref
      ? resolve(
          value.$ref
            .slice(2)
            .split("/")
            .reduce(
              (node: JSONSchema, key: string) =>
                node[key.replace(/~1/g, "/").replace(/~0/g, "~")],
              schema,
            ),
        )
      : value;
  }
  function encode(input: JSONSchema, value: any): any {
    const s = resolve(input);
    if (s.anyOf) {
      const optional =
        s.anyOf.some((option: JSONSchema) => resolve(option).type === "null") &&
        s.anyOf.some(
          (option: JSONSchema) =>
            Object.keys(resolve(option).properties ?? {}).join() === "value",
        );
      for (const option of s.anyOf) {
        if (optional && value === null && resolve(option).type === "null")
          continue;
        try {
          return encode(option, value);
        } catch {}
      }
      throw new Error("No fixture encoding");
    }
    if (s.type === "null") {
      if (value !== null && value !== undefined)
        throw new Error("Expected null");
      return null;
    }
    if (s.type === "object") {
      const properties = s.properties ?? {},
        keys = Object.keys(properties);
      if (keys.join() === "value")
        return { value: encode(properties.value, value) };
      if (keys.length === 2 && keys.includes("case") && keys.includes("value"))
        return {
          case: resolve(properties.case).const,
          value: encode(properties.value, value),
        };
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Expected object");
      if (
        keys.join() === "entries" &&
        resolve(resolve(properties.entries).items).prefixItems
      ) {
        const pair = resolve(resolve(properties.entries).items).prefixItems;
        return {
          entries: Object.entries(value).map(([key, child]) => [
            encode(pair[0], key),
            encode(pair[1], child),
          ]),
        };
      }
      return {
        ...value,
        ...Object.fromEntries(
          keys.map((key) => [key, encode(properties[key], value[key])]),
        ),
      };
    }
    if (s.type === "array") {
      if (!Array.isArray(value)) throw new Error("Expected array");
      return value.map((child, index) =>
        encode(s.prefixItems?.[index] ?? s.items, child),
      );
    }
    if (
      typeof value !== (s.type === "integer" ? "number" : s.type) ||
      (Object.hasOwn(s, "const") && value !== s.const) ||
      (s.enum && !s.enum.includes(value))
    )
      throw new Error("Invalid scalar");
    return value;
  }
  function node(value: Node): unknown[] {
    const def = catalog[value.type];
    if (!def) throw new Error("Unknown fixture component");
    const props = def.props.map((key: string) => value.props[key]);
    while (props.length && props.at(-1) === undefined) props.pop();
    const result: unknown[] = [value.type, props];
    if (def.slots.includes("default"))
      result.push((value.children ?? []).map(node));
    const slots = def.slots.filter((slot: string) => slot !== "default");
    if (slots.length)
      result.push(
        Object.fromEntries(
          slots.map((slot: string) => [
            slot,
            (value.slots?.[slot] ?? []).map(node),
          ]),
        ),
      );
    if (
      ["visible", "on", "watch", "repeat"].some((key) =>
        Object.hasOwn(value, key),
      )
    )
      result.push(
        Object.fromEntries(
          ["visible", "on", "watch", "repeat"].map((key) => [
            key,
            value[key as keyof Node],
          ]),
        ),
      );
    return result;
  }
  return JSON.stringify(
    encode(schema, { state: document.state, root: node(document.root) }),
  );
}

/** Expands bounded tuple lengths for Zod's importer, which otherwise requires every prefix item. */
export function compactFixtureSchema(
  generation: ReturnType<typeof createCompactGeneration>,
) {
  function expand(value: any): any {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(expand);
    const schema = Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        ["const", "enum", "default", "examples"].includes(key)
          ? child
          : expand(child),
      ]),
    ) as JSONSchema;
    if (
      schema.prefixItems &&
      schema.maxItems === schema.prefixItems.length &&
      schema.minItems < schema.maxItems
    ) {
      const { prefixItems, minItems, maxItems, items, ...rest } = schema;
      return {
        ...rest,
        anyOf: Array.from({ length: maxItems - minItems + 1 }, (_, index) => ({
          type: "array",
          prefixItems: prefixItems.slice(0, minItems + index),
          minItems: minItems + index,
          maxItems: minItems + index,
          items,
        })),
      };
    }
    return schema;
  }
  return z.fromJSONSchema(expand(generation.jsonSchema));
}

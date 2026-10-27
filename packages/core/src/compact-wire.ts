import { z } from "zod";

type Schema = z.core.$ZodType;
type Definition = z.core.$ZodTypes["_zod"]["def"];
type Domain = string[] | undefined;

function disjoint(domains: Domain[]): boolean {
  const seen = new Set<string>();
  for (const domain of domains) {
    if (!domain || domain.some((type) => seen.has(type))) return false;
    domain.forEach((type) => seen.add(type));
  }
  return true;
}

function domain(schema: Schema): Domain {
  const def = schema._zod.def as Definition;
  switch (def.type) {
    case "string":
    case "number":
    case "boolean":
    case "null":
    case "array":
      return [def.type];
    case "literal":
      return def.values.map((value) =>
        value === null ? "null" : typeof value,
      );
    case "enum":
      return Object.values(def.entries).map((value) => typeof value);
    case "optional":
      return ["null", 'object:["value"]'];
    case "record":
      return ['object:["entries"]'];
    case "object":
      return [`object:${JSON.stringify(Object.keys(def.shape).sort())}`];
    case "nullable": {
      const inner = domain(def.innerType);
      return inner && [...inner, "null"];
    }
    case "union": {
      const options = def.options.map(domain);
      return disjoint(options)
        ? (options.flat() as string[])
        : ['object:["case","value"]'];
    }
    case "any":
    case "unknown":
      return [
        "string",
        "number",
        "boolean",
        "null",
        "array",
        'object:["entries"]',
      ];
    default:
      return undefined;
  }
}

function entries(key: Schema, value: z.ZodType): z.ZodType {
  return z
    .strictObject({
      entries: z.array(z.strictObject({ key, value })),
    })
    .transform(({ entries }, ctx) => {
      const keys = entries.map((entry) => String(entry.key));
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({ code: "custom", message: "Duplicate record key" });
        return z.NEVER;
      }
      return Object.fromEntries(
        entries.map((entry, index) => [keys[index]!, entry.value]),
      );
    });
}

function validate(wire: z.ZodType, original: Schema): z.ZodType {
  return wire.transform((value, ctx) => {
    const parsed = z.safeParse(original, value);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => ctx.addIssue({ ...issue }));
      return z.NEVER;
    }
    return value;
  });
}

/** Builds strict wire inputs that decode to values validated by the original schemas. */
export function createCompactWireCodec(): (schema: z.ZodType) => z.ZodType {
  const cache = new Map<Schema, z.ZodType>();
  const json: z.ZodType = z.lazy(() =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(json),
      entries(z.string(), json),
    ]),
  );

  function convert(schema: Schema, path = "$"): z.ZodType {
    const cached = cache.get(schema);
    if (cached) return cached;
    let wire: z.ZodType;
    cache.set(
      schema,
      z.lazy(() => wire),
    );
    const def = schema._zod.def as Definition;
    function unsupported(type: string = def.type): never {
      throw new Error(
        `Unsupported compact wire schema type: ${type} at ${path}`,
      );
    }
    try {
      if (def.checks?.some((check) => check._zod.def.check === "overwrite"))
        unsupported(`${def.type} overwrite`);
      switch (def.type) {
        case "string":
        case "number":
        case "boolean":
        case "null":
        case "literal":
        case "enum":
          if (
            ("coerce" in def && def.coerce) ||
            (def.type === "literal" &&
              def.values.some(
                (value) =>
                  value !== null &&
                  !["string", "number", "boolean"].includes(typeof value),
              ))
          )
            unsupported();
          wire = schema as z.ZodType;
          break;
        case "optional":
          wire = validate(
            z.union([
              z.null().transform(() => undefined),
              z
                .strictObject({
                  value: convert(def.innerType, `${path}.optional`),
                })
                .transform((value) => value.value),
            ]),
            schema,
          );
          break;
        case "nullable":
          wire = validate(
            convert(def.innerType, `${path}.nullable`).nullable(),
            schema,
          );
          break;
        case "object":
          if (def.catchall && def.catchall._zod.def.type !== "never")
            unsupported("object catchall");
          wire = validate(
            z
              .strictObject(
                Object.fromEntries(
                  Object.entries(def.shape).map(([key, child]) => [
                    key,
                    convert(child, `${path}[${JSON.stringify(key)}]`),
                  ]),
                ),
              )
              .transform((value) =>
                Object.fromEntries(
                  Object.entries(value).filter(
                    ([, child]) => child !== undefined,
                  ),
                ),
              ),
            schema,
          );
          break;
        case "record":
          convert(def.keyType, `${path}.key`);
          wire = validate(
            entries(def.keyType, convert(def.valueType, `${path}.value`)),
            schema,
          );
          break;
        case "array":
          wire = validate(
            new z.ZodArray({
              ...def,
              element: convert(def.element, `${path}[]`),
              checks: def.checks?.filter(
                (check) => check._zod.def.check !== "custom",
              ),
            }),
            schema,
          );
          break;
        case "lazy":
          wire = validate(
            z.lazy(() => convert(def.getter(), `${path}.lazy`)),
            schema,
          );
          break;
        case "union": {
          const options = def.options.map((option, index) =>
            convert(option, `${path}.union[${index}]`),
          );
          wire = validate(
            disjoint(def.options.map(domain))
              ? z.union(options)
              : z.union(
                  options.map((option, index) =>
                    z
                      .strictObject({ case: z.literal(index), value: option })
                      .transform((value) => value.value),
                  ),
                ),
            schema,
          );
          break;
        }
        case "any":
        case "unknown":
          wire = validate(json, schema);
          break;
        default:
          unsupported();
      }
      cache.set(schema, wire);
      return wire;
    } catch (error) {
      cache.delete(schema);
      throw error;
    }
  }
  return convert;
}

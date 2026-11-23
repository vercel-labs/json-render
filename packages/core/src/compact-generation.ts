import { z } from "zod";
import { ActionBindingSchema } from "./actions";
import { VisibilityConditionStrictSchema } from "./visibility";
import { applySpecPatch } from "./types";
import type { SpecStreamLine, Spec } from "./types";
import { createJSONStream } from "./json-stream";
import { validateSpec, formatSpecIssues } from "./spec-validator";
import { createCompactWireCodec } from "./compact-wire";

/** Allows Zod's omitted __proto__ keys only after strict wire validation. */
function unchanged(
  input: unknown,
  parsed: unknown,
  allowDroppedProto = false,
): boolean {
  if (input === parsed) return true;
  if (
    !input ||
    !parsed ||
    typeof input !== "object" ||
    typeof parsed !== "object"
  )
    return false;
  const a = input as Record<string, unknown>,
    b = parsed as Record<string, unknown>;
  const keys = Object.keys(a).filter(
    (key) => !allowDroppedProto || key !== "__proto__" || Object.hasOwn(b, key),
  );
  return (
    Array.isArray(a) === Array.isArray(b) &&
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) =>
        Object.hasOwn(b, key) && unchanged(a[key], b[key], allowDroppedProto),
    )
  );
}

/** Accepts a catalog's data directly; schemas are shared by generation and decoding. */
export function createCompactGeneration(
  catalog: {
    components: Record<
      string,
      {
        props: z.ZodObject;
        slots?: string[];
        events?: string[];
        description?: string;
      }
    >;
    actions?: Record<string, { params: z.ZodType; description?: string }>;
  },
  options: { strict?: boolean } = {},
) {
  const jsonValue = z.json();
  const expression = z.union([
    ...["$state", "$item", "$bindState", "$bindItem", "$template"].map((key) =>
      z.strictObject({ [key]: z.string() }),
    ),
    z.strictObject({ $index: z.literal(true) }),
    z.strictObject({
      $cond: VisibilityConditionStrictSchema,
      $then: jsonValue,
      $else: jsonValue,
    }),
    z.strictObject({
      $computed: z.string(),
      args: z.record(z.string(), jsonValue).optional(),
    }),
  ]);
  function hasExpression(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    return (
      expression.safeParse(value).success ||
      Object.values(value).some(hasExpression)
    );
  }
  const dynamicSchemas = new Map<z.ZodType, z.ZodType>();
  function dynamic(value: z.ZodType): z.ZodType {
    const cached = dynamicSchemas.get(value);
    if (cached) return cached;
    let result: z.ZodType;
    dynamicSchemas.set(
      value,
      z.lazy(() => result),
    );
    const def: z.core.$ZodTypeDef & Record<string, unknown> = { ...value.def };
    for (const field of [
      "element",
      "valueType",
      "innerType",
      "rest",
      "left",
      "right",
      "catchall",
    ]) {
      const child = def[field];
      if (child instanceof z.ZodType && child.def.type !== "never")
        def[field] = dynamic(child);
    }
    if (def.shape)
      def.shape = Object.fromEntries(
        Object.entries(def.shape as Record<string, z.ZodType>).map(
          ([key, child]) => [key, dynamic(child)],
        ),
      );
    for (const field of ["options", "items"]) {
      if (Array.isArray(def[field]))
        def[field] = def[field].map((child: z.ZodType) => dynamic(child));
    }
    if (typeof def.getter === "function") {
      const getter = def.getter as () => z.ZodType;
      def.getter = () => dynamic(getter());
    }
    // Value refinements must run after expressions resolve; structural bounds still apply.
    if (value.def.checks)
      def.checks = value.def.checks.map((check) => {
        if (check._zod.def.check !== "custom") return check;
        const guarded = new z.core.$ZodCheck({
          ...check._zod.def,
          when: (payload) =>
            !hasExpression(payload.value) &&
            (check._zod.def.when?.(payload) ?? true),
        });
        guarded._zod.check = check._zod.check;
        return guarded;
      });
    // Expression-valued discriminators cannot be dispatched until render time.
    let literal = def.discriminator
      ? z.union(def.options as [z.ZodType, z.ZodType])
      : value;
    literal = literal.clone(def);
    if (value.description) literal = literal.describe(value.description);
    result = ["optional", "nullable", "lazy", "union", "intersection"].includes(
      def.type,
    )
      ? literal
      : z.union([literal, expression]);
    dynamicSchemas.set(value, result);
    return result;
  }
  const action = ActionBindingSchema.extend({
    params: z.record(z.string(), jsonValue).optional(),
  }).strict();
  const bindings = z.record(z.string(), z.union([action, z.array(action)]));

  const flatSchemas = new Map<string, z.ZodType>();
  const wireFields = new Map<string, Record<string, z.ZodType>>();
  const wireCodec = createCompactWireCodec();
  const wireElements: z.ZodObject[] = [];
  const wireNode: z.ZodType = z.lazy(() => wireElementSchema);
  const node: z.ZodType = z.lazy(() => elementSchema);
  const children = z.array(node).optional();
  const leafChildren = z.array(z.string()).max(0).optional();
  const emptySlots = z.strictObject({}).optional();
  const repeat = z
    .strictObject({
      statePath: z.union([z.string(), z.strictObject({ $item: z.string() })]),
      key: z.string().optional(),
    })
    .optional();
  const elements = Object.entries(catalog.components).map(
    ([type, component]) => {
      const props = Object.fromEntries(
        Object.entries(component.props.shape).map(([key, value]) => [
          key,
          dynamic(value),
        ]),
      );
      const hasChildren = component.slots?.includes("default") ?? false;
      const slots = Object.fromEntries(
        (component.slots ?? [])
          .filter((slot) => slot !== "default")
          .map((slot) => [slot, z.array(z.string()).optional()]),
      );
      const flat = z
        .strictObject({
          type: z.literal(type),
          props: z.strictObject(props),
          children: hasChildren
            ? z.array(z.string()).optional()
            : z.array(z.string()).max(0).optional(),
          slots: z.strictObject(slots).optional(),
          visible: VisibilityConditionStrictSchema.optional(),
          on: bindings.optional(),
          watch: bindings.optional(),
          repeat,
        })
        .describe(component.description ?? type);
      flatSchemas.set(type, flat);
      if (options.strict) {
        const fields = Object.fromEntries(
          Object.entries(flat.shape)
            .filter(([key]) => key !== "children" && key !== "slots")
            .map(([key, value]) => {
              try {
                return [key, wireCodec(value)];
              } catch (error) {
                throw new Error(
                  `Strict compact schema for ${type}.${key}: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }),
        );
        wireFields.set(type, fields);
        wireElements.push(
          z.strictObject({
            ...fields,
            type: z.literal(type),
            children: hasChildren
              ? z.array(wireNode)
              : z.array(z.string()).max(0),
            slots: z.strictObject(
              Object.fromEntries(
                (component.slots ?? [])
                  .filter((slot) => slot !== "default")
                  .map((slot) => [slot, z.array(wireNode)]),
              ),
            ),
          }),
        );
      }
      return flat.extend({
        children: hasChildren ? children : leafChildren,
        slots: !Object.keys(slots).length
          ? emptySlots
          : z
              .strictObject(
                Object.fromEntries(
                  (component.slots ?? [])
                    .filter((slot) => slot !== "default")
                    .map((slot) => [slot, z.array(node).optional()]),
                ),
              )
              .optional(),
      });
    },
  );
  if (!elements.length)
    throw new Error("Compact generation requires components");
  const elementSchema = z.discriminatedUnion("type", [
    elements[0]!,
    ...elements.slice(1),
  ]);
  const schema = z.strictObject({
    state: z.record(z.string(), jsonValue).optional(),
    root: node,
  });
  const wireElementUnion = options.strict
    ? z.discriminatedUnion("type", [wireElements[0]!, ...wireElements.slice(1)])
    : undefined;
  const wireElementSchema =
    wireElementUnion?.transform((value) =>
      Object.fromEntries(
        Object.entries(value).filter(([, child]) => child !== undefined),
      ),
    ) ?? node;
  const wireState = options.strict
    ? wireCodec(schema.shape.state)
    : schema.shape.state;
  const wireSchema = options.strict
    ? z
        .strictObject({ state: wireState, root: wireNode })
        .transform(({ state, root }) => ({
          ...(state === undefined ? {} : { state }),
          root,
        }))
    : schema;
  const jsonSchema = z.toJSONSchema(wireSchema, {
    io: options.strict ? "input" : "output",
    reused: "ref",
    override({ zodSchema, jsonSchema }) {
      // Unique type literals make anyOf equivalent; preserve the provider schema.
      if (
        (zodSchema === elementSchema || zodSchema === wireElementUnion) &&
        jsonSchema.oneOf
      ) {
        jsonSchema.anyOf = jsonSchema.oneOf;
        delete jsonSchema.oneOf;
      }
      if (JSON.stringify(jsonSchema.propertyNames) === '{"type":"string"}')
        delete jsonSchema.propertyNames;
      if (
        !options.strict &&
        jsonSchema.type === "object" &&
        jsonSchema.additionalProperties === false &&
        jsonSchema.properties &&
        !Object.keys(jsonSchema.properties).length
      )
        Object.assign(jsonSchema, { const: {} });
    },
  });
  const names = new Map(
    Object.keys(jsonSchema.$defs ?? {}).map((name, i) => [name, `s${i}`]),
  );
  function shortenRefs(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(shortenRefs);
      return;
    }
    const object = value as Record<string, unknown>;
    if (typeof object.$ref === "string" && object.$ref.startsWith("#/$defs/")) {
      const name = names.get(object.$ref.slice(8));
      if (name) object.$ref = `#/$defs/${name}`;
    }
    for (const [key, child] of Object.entries(object)) {
      if (
        [
          "properties",
          "$defs",
          "patternProperties",
          "dependentSchemas",
        ].includes(key) &&
        child &&
        typeof child === "object"
      )
        Object.values(child).forEach(shortenRefs);
      else if (!["const", "enum", "default", "examples"].includes(key))
        shortenRefs(child);
    }
  }
  shortenRefs(jsonSchema);
  if (jsonSchema.$defs)
    jsonSchema.$defs = Object.fromEntries(
      Object.entries(jsonSchema.$defs).map(([name, value]) => [
        names.get(name)!,
        value,
      ]),
    );

  return {
    jsonSchema,
    prompt:
      "Design the requested UI using the supplied response schema. Return compact JSON without unnecessary whitespace. " +
      "The document has a root component and optional state. Each component has type and props. " +
      "Put nested components in children for the default slot, or in slots[name] for named slots. " +
      "Layout containers need child components to display content. Do not output element IDs or JSONL patches. " +
      "Props may contain expressions such as {$state:'/path'} to read state or {$bindState:'/path'} for two-way binding. A repeat renders its children once per item; its statePath must reference an array in state. Events use the renderer's standard contract. Component catalog:\n" +
      JSON.stringify(
        Object.fromEntries(
          Object.entries(catalog.components).map(([type, component]) => [
            type,
            {
              props: Object.keys(component.props.shape),
              slots: component.slots ?? [],
              ...(component.events ? { events: component.events } : {}),
              ...(component.description
                ? { description: component.description }
                : {}),
            },
          ]),
        ),
      )
        .concat(
          catalog.actions && Object.keys(catalog.actions).length
            ? "\nActions: " +
                JSON.stringify(
                  Object.fromEntries(
                    Object.entries(catalog.actions).map(([name, action]) => [
                      name,
                      {
                        params: z.toJSONSchema(action.params),
                        description: action.description,
                      },
                    ]),
                  ),
                )
            : "",
        )
        .concat(
          options.strict
            ? "\nStrict wire format: include every field required by the response schema. " +
                "Nodes always include children and slots; use empty arrays for unused children and named slots. " +
                'Optional values use null for absence or {"value":...} for presence; {"value":null} preserves an explicit null. ' +
                'Records use {"entries":[{"key":"name","value":...}]}, including state, event maps and action params. ' +
                "For unions with case/value fields, choose the case specified in the schema and encode that branch in value. " +
                "Encode props and expressions using these rules recursively; type, children and slots retain their node structure."
            : "",
        ),
    createCompiler() {
      type Node = {
        id: string;
        raw: Record<string, unknown>;
        fields: Set<string>;
        published: boolean;
        children: string[];
        slots: Record<string, string[]>;
        parent?: Node;
        slot?: string;
        index?: number;
      };
      const nodes = new Map<string, Node>();
      let result: Spec = { root: "", elements: {} },
        patches: SpecStreamLine[] = [],
        failed = false;
      const pathKey = (path: (string | number)[]) => JSON.stringify(path);
      function apply(patch: SpecStreamLine) {
        applySpecPatch(result, patch);
        patches.push(patch);
      }
      function publish(entry: Node) {
        if (!entry.fields.has("type") || !entry.fields.has("props")) return;
        const type = entry.raw.type;
        if (typeof type !== "string" || !flatSchemas.has(type))
          throw new Error("Unknown component type");
        const element = Object.fromEntries(
          [...entry.fields]
            .filter((key) => key !== "children" && key !== "slots")
            .map((key) => {
              const field = wireFields.get(type)?.[key];
              if (options.strict && !field)
                throw new Error(`Unknown component field: ${key}`);
              return [
                key,
                field ? field.parse(entry.raw[key]) : entry.raw[key],
              ];
            })
            .filter(([, value]) => value !== undefined),
        );
        if (
          catalog.components[type]!.slots?.includes("default") ||
          entry.fields.has("children")
        )
          element.children = entry.children.slice();
        if (entry.fields.has("slots") || Object.keys(entry.slots).length)
          element.slots = Object.fromEntries(
            Object.entries(entry.slots).map(([slot, ids]) => [
              slot,
              ids.slice(),
            ]),
          );
        const parsed = flatSchemas.get(type)!.parse(element);
        const values = element.props as Record<string, unknown>;
        if (!hasExpression(values)) {
          const literal = catalog.components[type]!.props.parse(values);
          if (!unchanged(values, literal, options.strict))
            throw new Error(
              "Schema validation must not strip or transform generated values",
            );
        }
        if (!unchanged(element, parsed, options.strict))
          throw new Error(
            "Schema validation must not strip or transform generated values",
          );
        if (!entry.parent && !entry.published)
          apply({ op: "add", path: "/root", value: entry.id });
        apply({
          op: "add",
          path:
            "/elements/" + entry.id.replace(/~/g, "~0").replace(/\//g, "~1"),
          value: options.strict ? element : parsed,
        });
        if (!entry.published && entry.parent) {
          const list =
            entry.slot === undefined
              ? entry.parent.children
              : (entry.parent.slots[entry.slot] ??= []);
          list[entry.index!] = entry.id;
          entry.published = true;
          publish(entry.parent);
        }
        entry.published = true;
      }
      const parser = createJSONStream((path, value, complete) => {
        const key = pathKey(path);
        if (
          !complete &&
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          let parent: Node | undefined, slot: string | undefined;
          if (typeof path.at(-1) === "number") {
            if (path.at(-2) === "children")
              parent = nodes.get(pathKey(path.slice(0, -2)));
            else if (path.at(-3) === "slots") {
              parent = nodes.get(pathKey(path.slice(0, -3)));
              slot = path.at(-2) as string;
            }
          }
          if ((path.length === 1 && path[0] === "root") || parent) {
            nodes.set(key, {
              id: `e${nodes.size}`,
              raw: value as Record<string, unknown>,
              fields: new Set(),
              published: false,
              children: [],
              slots: Object.create(null),
              parent,
              slot,
              index: path.at(-1) as number,
            });
          }
        }
        if (!complete) return;
        if (path.length === 1 && path[0] === "state") {
          const state = wireState.parse(value);
          if (state !== undefined)
            apply({ op: "add", path: "/state", value: state });
        }
        const owner = nodes.get(pathKey(path.slice(0, -1)));
        if (owner && typeof path.at(-1) === "string") {
          owner.fields.add(path.at(-1) as string);
          publish(owner);
        }
      });
      return {
        push(chunk: string) {
          if (failed)
            throw new Error("Compact generation stream already failed");
          patches = [];
          result = { ...result, elements: { ...result.elements } };
          try {
            parser.push(chunk);
            return { result, newPatches: patches };
          } catch (error) {
            failed = true;
            throw error;
          }
        },
        getResult() {
          if (failed) throw new Error("Invalid compact generation");
          const raw = options.strict
              ? wireSchema.parse(parser.getResult())
              : parser.getResult(),
            parsed = schema.parse(raw);
          if (!unchanged(raw, parsed, options.strict))
            throw new Error(
              "Schema validation must not strip or transform generated values",
            );
          const validation = validateSpec(result);
          if (!validation.valid)
            throw new Error(formatSpecIssues(validation.issues));
          return result;
        },
      };
    },
    createTransform() {
      const compiler = this.createCompiler();
      return new TransformStream<string, string>({
        transform(chunk, controller) {
          const { newPatches } = compiler.push(chunk);
          for (const patch of newPatches)
            controller.enqueue(JSON.stringify(patch) + "\n");
        },
        flush() {
          compiler.getResult();
        },
      });
    },
  };
}

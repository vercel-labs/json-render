import { z } from "zod";
import { ActionBindingSchema } from "./actions";
import { VisibilityConditionStrictSchema } from "./visibility";
import { applySpecPatch } from "./types";
import type { SpecStreamLine, Spec } from "./types";
import { createJSONStream } from "./json-stream";
import { validateSpec, formatSpecIssues } from "./spec-validator";
import { createCompactWireCodec } from "./compact-wire";

export interface CompactCompiler {
  push(chunk: string): { result: Spec; newPatches: SpecStreamLine[] };
  getResult(): Spec;
}

export interface CompactGeneration {
  jsonSchema: Record<string, unknown>;
  prompt: string;
  createCompiler(): CompactCompiler;
  createTransform(): TransformStream<string, string>;
}

/** Allows Zod's omitted __proto__ keys only after strict wire validation. */
function unchanged(input: unknown, parsed: unknown): boolean {
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
    (key) => key !== "__proto__" || Object.hasOwn(b, key),
  );
  return (
    Array.isArray(a) === Array.isArray(b) &&
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && unchanged(a[key], b[key]))
  );
}

/**
 * Accepts a catalog's data directly; schemas are shared by generation and decoding.
 * The default strict mode needs a provider that enforces the schema; pass `strict: false` for providers that do not, which
 * uses a flat format, lists the catalog in the prompt and validates every element while decoding.
 */
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
): CompactGeneration {
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

  const wireCodec = createCompactWireCodec();
  const metadata = z.strictObject({
    visible: VisibilityConditionStrictSchema.optional(),
    on: bindings.optional(),
    watch: bindings.optional(),
    repeat: z
      .strictObject({
        statePath: z.union([z.string(), z.strictObject({ $item: z.string() })]),
        key: z.string().optional(),
      })
      .optional(),
  });
  const wireMetadata = wireCodec(metadata);
  const nodeShape = z.array(z.unknown());
  const wireNode: z.ZodType = z.lazy(() =>
    z.union([...layouts.values()].map((layout) => layout.wire)),
  );
  const layouts = new Map(
    Object.entries(catalog.components).map(([type, component]) => {
      const propEntries = (
        Object.entries(component.props.shape) as [string, z.ZodType][]
      ).map(([key, value]) => ({
        key,
        value,
        optional: value._zod.optin === "optional",
      }));
      const ordered = [
        ...propEntries.filter((field) => !field.optional),
        ...propEntries.filter((field) => field.optional),
      ];
      const props = z.strictObject(
        Object.fromEntries(
          propEntries.map(({ key, value }) => [key, dynamic(value)]),
        ),
      );
      const notes = ordered.flatMap(({ key, value }) =>
        value.description ? [`${key}: ${value.description}`] : [],
      );
      const order = `Props in order: ${ordered.map(({ key, optional }) => `${key}${optional ? "?" : ""}`).join(", ")}.`;
      const wireProps = new z.ZodTuple({
        type: "tuple",
        rest: null,
        items: ordered.map(({ key, optional }) => {
          const field = wireCodec(props.shape[key]!);
          return optional ? field.optional() : field;
        }),
      })
        .describe(order + (notes.length ? ` ${notes.join("; ")}` : ""))
        .transform((values) =>
          Object.fromEntries(
            ordered
              .map(({ key }, index) => [key, values[index]])
              .filter(([, value]) => value !== undefined),
          ),
        );
      const slots = (component.slots ?? []).filter(
        (slot) => slot !== "default",
      );
      const childrenIndex = component.slots?.includes("default")
        ? 2
        : undefined;
      const slotsIndex = slots.length
        ? childrenIndex === undefined
          ? 2
          : 3
        : undefined;
      const metadataIndex =
        2 +
        (childrenIndex === undefined ? 0 : 1) +
        (slotsIndex === undefined ? 0 : 1);
      function tuple(child: z.ZodType) {
        return z.tuple([
          z.literal(type),
          wireProps,
          ...(childrenIndex === undefined ? [] : [z.array(child)]),
          ...(slotsIndex === undefined
            ? []
            : [
                z.strictObject(
                  Object.fromEntries(
                    slots.map((slot) => [slot, z.array(child)]),
                  ),
                ),
              ]),
          wireMetadata.optional(),
        ]);
      }
      return [
        type,
        {
          props: wireProps,
          ordered,
          order,
          notes,
          metadataIndex,
          childrenIndex,
          slotsIndex,
          slots,
          wire: tuple(wireNode).describe(
            [
              component.description ?? type,
              component.events?.length
                ? `Events: ${component.events.join(", ")}.`
                : "",
            ]
              .filter(Boolean)
              .join(" "),
          ),
          complete: tuple(nodeShape),
          flat: z.strictObject({
            type: z.literal(type),
            props,
            children: z.array(z.string()).optional(),
            slots: z
              .strictObject(
                Object.fromEntries(
                  slots.map((slot) => [slot, z.array(z.string())]),
                ),
              )
              .optional(),
            ...metadata.shape,
          }),
        },
      ] as const;
    }),
  );
  if (!layouts.size) throw new Error("Compact generation requires components");
  const wireState = wireCodec(z.record(z.string(), jsonValue).optional());
  const framing = z.strictObject({ state: wireState, root: nodeShape });
  const jsonSchema = z.toJSONSchema(
    z.strictObject({ state: wireState, root: wireNode }),
    {
      io: "input",
      reused: "ref",
      override({ zodSchema, jsonSchema }) {
        if (zodSchema._zod.def.type === "tuple") {
          const def = (zodSchema as z.ZodTuple)._zod.def;
          if (!def.items.length) delete jsonSchema.prefixItems;
          jsonSchema.minItems = Math.max(
            jsonSchema.minItems ?? 0,
            def.items.reduce(
              (last, item, index) =>
                item._zod.optin === "optional" ? last : index + 1,
              0,
            ),
          );
          if (!def.rest) {
            jsonSchema.maxItems = Math.min(
              jsonSchema.maxItems ?? Infinity,
              def.items.length,
            );
            jsonSchema.items = { type: "null" };
          }
        }
        if (JSON.stringify(jsonSchema.propertyNames) === '{"type":"string"}')
          delete jsonSchema.propertyNames;
      },
    },
  );
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

  type Layout = NonNullable<ReturnType<typeof layouts.get>>;
  function checkElement(
    type: string,
    layout: Layout,
    element: { props: Record<string, unknown> },
  ) {
    const parsed = layout.flat.parse(element);
    if (!hasExpression(element.props)) {
      const literal = catalog.components[type]!.props.parse(element.props);
      if (!unchanged(element.props, literal))
        throw new Error(
          "Schema validation must not strip or transform generated values",
        );
    }
    if (!unchanged(element, parsed))
      throw new Error(
        "Schema validation must not strip or transform generated values",
      );
  }
  const actionsPrompt =
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
      : "";
  /** Parses streamed JSON through onValue and collects the patches it applies; getResult checks framing and the finished spec. */
  function streamCompiler(
    framing: z.ZodType,
    onValue: Parameters<typeof createJSONStream>[0],
  ) {
    let result: Spec = { root: "", elements: {} },
      patches: SpecStreamLine[] = [],
      failed = false;
    const parser = createJSONStream(onValue);
    return {
      apply(patch: SpecStreamLine) {
        applySpecPatch(result, patch);
        patches.push(patch);
      },
      push(chunk: string) {
        if (failed) throw new Error("Compact generation stream already failed");
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
        framing.parse(parser.getResult());
        const validation = validateSpec(result);
        if (!validation.valid)
          throw new Error(formatSpecIssues(validation.issues));
        return result;
      },
    };
  }
  function toTransform(compiler: CompactCompiler) {
    return new TransformStream<string, string>({
      transform(chunk, controller) {
        for (const patch of compiler.push(chunk).newPatches)
          controller.enqueue(JSON.stringify(patch) + "\n");
      },
      flush() {
        compiler.getResult();
      },
    });
  }

  /** Flat [depth,type,props,meta?] elements with plain JSON, for providers that do not enforce schemas. Named slots are not supported. */
  function relaxed() {
    const state = z.record(z.string(), jsonValue).nullable();
    const framing = z.strictObject({ state, elements: z.array(z.unknown()) });
    type Schema = {
      enum?: unknown[];
      anyOf?: Schema[];
      type?: string;
      items?: Schema;
      properties?: Record<string, Schema>;
      required?: string[];
    };
    const typeText = (schema: Schema): string =>
      schema.enum
        ? schema.enum.map((value) => JSON.stringify(value)).join("|")
        : schema.anyOf
          ? schema.anyOf
              .filter((option) => option.type !== "null")
              .map(typeText)
              .join("|")
          : schema.type === "array"
            ? `${typeText(schema.items ?? {})}[]`
            : schema.type === "object" && schema.properties
              ? `{${Object.entries(schema.properties)
                  .map(
                    ([key, child]) =>
                      `${key}${schema.required?.includes(key) ? "" : "?"}:${typeText(child)}`,
                  )
                  .join(",")}}`
              : (schema.type ?? "any");
    const listing = [...layouts]
      .map(([type, layout]) => {
        const { description, events } = catalog.components[type]!;
        const props = layout.ordered.map(
          ({ key, value, optional }) =>
            `${key}${optional || value.safeParse(null).success ? "?" : ""}:${typeText(z.toJSONSchema(value, { io: "input", unrepresentable: "any" }) as Schema)}`,
        );
        return [
          `${type}${layout.childrenIndex === undefined ? "" : " (children)"}: [${props.join(", ")}]`,
          description,
          events?.length && `Events: ${events.join(", ")}.`,
          ...layout.notes,
        ]
          .filter(Boolean)
          .join(" - ");
      })
      .join("\n");

    function createCompiler() {
      const stack: {
        id: string;
        layout: Layout;
        element: Record<string, unknown>;
      }[] = [];
      let count = 0;
      const compiler = streamCompiler(framing, (path, value, complete) => {
        if (!complete) return;
        if (path.length === 1 && path[0] === "state") {
          const initial = state.parse(value);
          if (initial)
            compiler.apply({ op: "add", path: "/state", value: initial });
          return;
        }
        if (path.length !== 2 || path[0] !== "elements") return;
        const id = `e${count++}`;
        if (
          !Array.isArray(value) ||
          !Number.isInteger(value[0]) ||
          (value.length !== 3 && value.length !== 4)
        )
          throw new Error(
            `${id} must be [depth,type,props] or [depth,type,props,meta]`,
          );
        const [depth, type, tuple, meta] = value as [
          number,
          string,
          unknown,
          unknown,
        ];
        const layout = layouts.get(type);
        if (!layout) throw new Error(`${id} uses unknown component "${type}"`);
        const parent = depth ? stack[depth - 1] : undefined;
        if (depth ? parent?.layout.childrenIndex === undefined : count > 1)
          throw new Error(
            depth
              ? `${id} at depth ${depth} has no parent that accepts children`
              : `${id} is a second root`,
          );
        const entries = Object.entries(meta ?? {});
        const fields = entries.filter(([, field]) => field !== null);
        const isProp = (key: string) =>
          !(key in metadata.shape) &&
          layout.ordered.some((field) => field.key === key);
        const unsupported = entries.find(
          ([key]) => !isProp(key) && !Object.keys(metadata.shape).includes(key),
        );
        if (unsupported)
          throw new Error(
            `${id} (${type}) has unsupported metadata "${unsupported[0]}"`,
          );
        const named: Record<string, unknown> = {
          ...(Array.isArray(tuple)
            ? Object.fromEntries(
                tuple.map((prop, index) => [
                  layout.ordered[index]?.key ?? index,
                  prop,
                ]),
              )
            : Object(tuple ?? {})),
          ...Object.fromEntries(fields.filter(([key]) => isProp(key))),
        };
        const props: Record<string, unknown> = {};
        layout.ordered.forEach(({ key, value, optional }) => {
          const prop = named[key];
          if (prop !== undefined && prop !== null) props[key] = prop;
          else if (
            !optional ||
            (prop === null && value.safeParse(null).success)
          )
            props[key] = null;
        });
        const element = {
          ...Object.fromEntries(fields.filter(([key]) => !isProp(key))),
          type,
          props,
          ...(layout.childrenIndex === undefined ? {} : { children: [] }),
        };
        try {
          if (
            Object.keys(named).some(
              (key) => !layout.ordered.some((field) => field.key === key),
            )
          )
            throw new Error("unknown or extra props");
          checkElement(type, layout, element);
        } catch (error) {
          throw new Error(
            `${id} (${type}) is invalid: ${error instanceof z.ZodError ? z.prettifyError(error) : (error as Error).message}. ${layout.order}`,
          );
        }
        compiler.apply({ op: "add", path: `/elements/${id}`, value: element });
        if (parent) {
          parent.element = {
            ...parent.element,
            children: [...(parent.element.children as string[]), id],
          };
          compiler.apply({
            op: "add",
            path: `/elements/${parent.id}`,
            value: parent.element,
          });
        } else compiler.apply({ op: "add", path: "/root", value: id });
        stack.length = depth;
        stack[depth] = { id, layout, element };
      });
      return compiler;
    }

    return {
      jsonSchema: {
        type: "object",
        properties: {
          state: { anyOf: [{ type: "null" }, { type: "object" }] },
          elements: { type: "array", items: { type: "array" } },
        },
        required: ["state", "elements"],
      },
      prompt:
        [
          "Design the requested UI as compact JSON without unnecessary whitespace.",
          "The document is {state,elements}. state is a plain JSON object of initial values, or null.",
          "elements is a flat array in outline order, each parent before its children. Each element is [depth,type,props] or [depth,type,props,meta].",
          "depth is 0 for the single root and parent depth + 1 for a child; the parent is the closest earlier element one level up. Only components marked (children) can be parents.",
          "props is a tuple in the order listed below. Use null for an absent prop and drop trailing absent props. Write values directly; never wrap them in {value:...}.",
          "Props may use {$state:'/path'}, {$bindState:'/path'}, {$item:'field'}, or other expressions.",
          "meta is an object with any of: visible (a condition such as {$state:'/path',eq:'x'}), on (event name to an action binding {action,params}), watch (state path to an action binding), repeat ({statePath,key}). Omit meta and its fields when not needed.",
          "A repeat renders its single child element once per item; statePath must reference an array in state. Layout containers need children to display content. Do not output element IDs or JSONL patches.",
          "Components (props in tuple order; ? marks optional):",
          listing,
        ].join("\n") + actionsPrompt,
      createCompiler,
      createTransform() {
        return toTransform(createCompiler());
      },
    };
  }

  if (options.strict === false) return relaxed();

  return {
    jsonSchema,
    prompt:
      "Design the requested UI using the supplied response schema. Return compact JSON without unnecessary whitespace. " +
      "The document is {state,root}; state is null when absent. Nodes are positional arrays: " +
      "[type,props,children if supported,slots if supported,metadata if needed]. " +
      "Props are tuples; each props schema description lists the positions in order (required first). Trim trailing absent optional props; use null for interior absence. " +
      "Nonnullable optional values are direct; nullable or unknown optionals use {value:...} for presence, including {value:null}. " +
      "Children is an array of nodes; slots is an object of named node arrays, including empty arrays. " +
      "Metadata contains visible,on,watch,repeat; when present include all four fields, using null for absence. " +
      "Records use {entries:[[key,value],...]}, including state, event maps and action params. " +
      "For tagged unions use the schema's case/value branch. Nested data and expressions follow their schema recursively. " +
      "Props may use {$state:'/path'}, {$bindState:'/path'}, {$item:'field'}, or other schema expressions. " +
      "A repeat renders its children per item; statePath must reference an array in state. " +
      "Layout containers need children to display content. Do not output element IDs or JSONL patches." +
      actionsPrompt,
    createCompiler() {
      type Node = {
        id: string;
        raw: unknown[];
        layout?: Layout;
        props?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        published: boolean;
        children: string[];
        slots: Record<string, string[]>;
        parent?: Node;
        slot?: string;
        index: number;
      };
      const nodes = new Map<string, Node>();
      const pathKey = (path: (string | number)[]) => JSON.stringify(path);
      const apply = (patch: SpecStreamLine) => compiler.apply(patch);
      function publish(entry: Node) {
        if (!entry.props || !entry.layout) return;
        const type = entry.raw[0] as string,
          layout = entry.layout;
        const element = {
          type,
          props: entry.props,
          ...(layout.childrenIndex === undefined
            ? {}
            : { children: entry.children.slice() }),
          ...(layout.slotsIndex === undefined
            ? {}
            : {
                slots: Object.fromEntries(
                  layout.slots.map((slot) => [
                    slot,
                    (entry.slots[slot] ?? []).slice(),
                  ]),
                ),
              }),
          ...entry.metadata,
        };
        checkElement(type, layout, element);
        if (!entry.parent && !entry.published)
          apply({ op: "add", path: "/root", value: entry.id });
        apply({ op: "add", path: "/elements/" + entry.id, value: element });
        if (!entry.published && entry.parent) {
          const list =
            entry.slot === undefined
              ? entry.parent.children
              : (entry.parent.slots[entry.slot] ??= []);
          list[entry.index] = entry.id;
          entry.published = true;
          publish(entry.parent);
        }
        entry.published = true;
      }
      const compiler = streamCompiler(framing, (path, value, complete) => {
        const key = pathKey(path);
        if (!complete) {
          if (!Array.isArray(value)) return;
          const isRoot = path.length === 1 && path[0] === "root";
          if (!isRoot && typeof path.at(-1) !== "number") return;
          let parent: Node | undefined, slot: string | undefined;
          const childOwner = nodes.get(pathKey(path.slice(0, -2)));
          const slotOwner = nodes.get(pathKey(path.slice(0, -3)));
          if (
            childOwner?.layout?.childrenIndex !== undefined &&
            path.at(-2) === childOwner.layout.childrenIndex
          )
            parent = childOwner;
          else if (
            slotOwner?.layout?.slotsIndex !== undefined &&
            path.at(-3) === slotOwner.layout.slotsIndex &&
            slotOwner.layout.slots.includes(path.at(-2) as string)
          ) {
            parent = slotOwner;
            slot = path.at(-2) as string;
          }
          if (!isRoot && !parent) return;
          nodes.set(key, {
            id: `e${nodes.size}`,
            raw: value,
            published: false,
            children: [],
            slots: Object.create(null),
            parent,
            slot,
            index: path.at(-1) as number,
          });
          return;
        }
        if (path.length === 1 && path[0] === "state") {
          const state = wireState.parse(value);
          if (state !== undefined)
            apply({ op: "add", path: "/state", value: state });
        }
        const entry = nodes.get(key);
        if (entry) {
          if (!entry.layout) throw new Error("Unknown component type");
          entry.layout.complete.parse(entry.raw);
        }
        const owner = nodes.get(pathKey(path.slice(0, -1)));
        if (!owner) return;
        const index = path.at(-1);
        if (index === 0) {
          owner.layout =
            typeof value === "string" ? layouts.get(value) : undefined;
          if (!owner.layout) throw new Error("Unknown component type");
        } else if (index === 1) {
          owner.props = owner.layout!.props.parse(value);
          publish(owner);
        } else if (index === owner.layout?.metadataIndex) {
          owner.metadata = wireMetadata.parse(value) as Record<string, unknown>;
          publish(owner);
        }
      });
      return compiler;
    },
    createTransform() {
      return toTransform(this.createCompiler());
    },
  };
}

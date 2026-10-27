import { z } from "zod";
import { ActionBindingSchema } from "./actions";
import { VisibilityConditionStrictSchema } from "./visibility";
import { applySpecPatch } from "./types";
import type { SpecStreamLine, Spec } from "./types";
import { createJSONStream } from "./json-stream";
import { validateSpec, formatSpecIssues } from "./spec-validator";
import { createCompactWireCodec } from "./compact-wire";

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

/** Accepts a catalog's data directly; schemas are shared by generation and decoding. */
export function createCompactGeneration(catalog: {
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
}) {
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
    // These wrappers already accept expressions through their transformed inner schemas.
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
      const wireProps = new z.ZodTuple({
        type: "tuple",
        rest: null,
        items: ordered.map(({ key, optional }) => {
          const field = wireCodec(props.shape[key]!);
          return optional ? field.optional() : field;
        }),
      }).transform((values) =>
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
          metadataIndex,
          childrenIndex,
          slotsIndex,
          slots,
          order: ordered.map(({ key }) => key),
          wire: tuple(wireNode).describe(component.description ?? type),
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
  // Short local references reduce request size without changing constraints.
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
      "The document is {state,root}; state is null when absent. Nodes are positional arrays: " +
      "[type,props,children if supported,slots if supported,metadata if needed]. " +
      "Props are tuples in the catalog order below (required first). Trim trailing absent optional props; use null for interior absence. " +
      "Nonnullable optional values are direct; nullable or unknown optionals use {value:...} for presence, including {value:null}. " +
      "Children is an array of nodes; slots is an object of named node arrays, including empty arrays. " +
      "Metadata contains visible,on,watch,repeat; when present include all four fields, using null for absence. " +
      "Records use {entries:[[key,value],...]}, including state, event maps and action params. " +
      "For tagged unions use the schema's case/value branch. Nested data and expressions follow their schema recursively. " +
      "Props may use {$state:'/path'}, {$bindState:'/path'}, {$item:'field'}, or other schema expressions. " +
      "A repeat renders its children per item; statePath must reference an array in state. " +
      "Layout containers need children to display content. Do not output element IDs or JSONL patches. Component catalog:\n" +
      JSON.stringify(
        Object.fromEntries(
          Object.entries(catalog.components).map(([type, component]) => [
            type,
            {
              props: layouts.get(type)!.order,
              slots: component.slots ?? [],
              ...(component.events ? { events: component.events } : {}),
              ...(component.description
                ? { description: component.description }
                : {}),
            },
          ]),
        ),
      ) +
      (catalog.actions && Object.keys(catalog.actions).length
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
        : ""),
    createCompiler() {
      type Layout = NonNullable<ReturnType<typeof layouts.get>>;
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
      let result: Spec = { root: "", elements: {} },
        patches: SpecStreamLine[] = [],
        failed = false;
      const pathKey = (path: (string | number)[]) => JSON.stringify(path);
      function apply(patch: SpecStreamLine) {
        applySpecPatch(result, patch);
        patches.push(patch);
      }
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
      const parser = createJSONStream((path, value, complete) => {
        const key = pathKey(path);
        if (!complete && Array.isArray(value)) {
          let parent: Node | undefined, slot: string | undefined;
          if (typeof path.at(-1) === "number") {
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
          }
          if ((path.length === 1 && path[0] === "root") || parent)
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
        }
        if (!complete) return;
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
          framing.parse(parser.getResult());
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

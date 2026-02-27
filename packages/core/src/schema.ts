import { z } from "zod";

/**
 * Schema builder primitives
 */
export interface SchemaBuilder {
  /** String type */
  string(): SchemaType<"string">;
  /** Number type */
  number(): SchemaType<"number">;
  /** Boolean type */
  boolean(): SchemaType<"boolean">;
  /** Array of type */
  array<T extends SchemaType>(item: T): SchemaType<"array", T>;
  /** Object with shape */
  object<T extends Record<string, SchemaType>>(
    shape: T,
  ): SchemaType<"object", T>;
  /** Record/map with value type */
  record<T extends SchemaType>(value: T): SchemaType<"record", T>;
  /** Any type */
  any(): SchemaType<"any">;
  /** Placeholder for user-provided Zod schema */
  zod(): SchemaType<"zod">;
  /** Reference to catalog key (e.g., 'catalog.components') */
  ref(path: string): SchemaType<"ref", string>;
  /** Props from referenced catalog entry */
  propsOf(path: string): SchemaType<"propsOf", string>;
  /** Map of named entries with shared shape */
  map<T extends Record<string, SchemaType>>(
    entryShape: T,
  ): SchemaType<"map", T>;
  /** Optional modifier */
  optional(): { optional: true };
}

/**
 * Schema type representation
 */
export interface SchemaType<TKind extends string = string, TInner = unknown> {
  kind: TKind;
  inner?: TInner;
  optional?: boolean;
}

/**
 * Schema definition shape
 */
export interface SchemaDefinition<
  TSpec extends SchemaType = SchemaType,
  TCatalog extends SchemaType = SchemaType,
> {
  /** What the AI-generated spec looks like */
  spec: TSpec;
  /** What the catalog must provide */
  catalog: TCatalog;
}

/**
 * Schema instance with methods
 */
export interface Schema<TDef extends SchemaDefinition = SchemaDefinition> {
  /** The schema definition */
  readonly definition: TDef;
  /** Custom prompt template for this schema */
  readonly promptTemplate?: PromptTemplate;
  /** Default rules baked into the schema (injected before customRules) */
  readonly defaultRules?: string[];
  /** Built-in actions always available at runtime (injected into prompts automatically) */
  readonly builtInActions?: BuiltInAction[];
  /** Create a catalog from this schema */
  createCatalog<TCatalog extends InferCatalogInput<TDef["catalog"]>>(
    catalog: TCatalog,
  ): Catalog<TDef, TCatalog>;
}

/**
 * Catalog instance with methods
 */
export interface Catalog<
  TDef extends SchemaDefinition = SchemaDefinition,
  TCatalog = unknown,
> {
  /** The schema this catalog is based on */
  readonly schema: Schema<TDef>;
  /** The catalog data */
  readonly data: TCatalog;
  /** Component names */
  readonly componentNames: string[];
  /** Action names */
  readonly actionNames: string[];
  /** Generate system prompt for AI */
  prompt(options?: PromptOptions): string;
  /** Export as JSON Schema for structured outputs */
  jsonSchema(): object;
  /** Validate a spec against this catalog */
  validate(spec: unknown): SpecValidationResult<InferSpec<TDef, TCatalog>>;
  /** Get the Zod schema for the spec */
  zodSchema(): z.ZodType<InferSpec<TDef, TCatalog>>;
  /** Type helper for the spec type */
  readonly _specType: InferSpec<TDef, TCatalog>;
}

/**
 * Prompt generation options
 */
export interface PromptOptions {
  /** Custom system message intro */
  system?: string;
  /** Additional rules to append */
  customRules?: string[];
  /**
   * Output mode for the generated prompt.
   *
   * - `"generate"` (default): The LLM should output only JSONL patches (no prose).
   * - `"chat"`: The LLM should respond conversationally first, then output JSONL patches.
   *   Includes rules about interleaving text with JSONL and not wrapping in code fences.
   */
  mode?: "generate" | "chat";
}

/**
 * Context provided to prompt templates
 */
export interface PromptContext<TCatalog = unknown> {
  /** The catalog data */
  catalog: TCatalog;
  /** Component names from the catalog */
  componentNames: string[];
  /** Action names from the catalog (if any) */
  actionNames: string[];
  /** Prompt options provided by the user */
  options: PromptOptions;
  /** Helper to format a Zod type as a human-readable string */
  formatZodType: (schema: z.ZodType) => string;
}

/**
 * Prompt template function type
 */
export type PromptTemplate<TCatalog = unknown> = (
  context: PromptContext<TCatalog>,
) => string;

/**
 * A built-in action that is always available regardless of catalog configuration.
 * These are handled by the runtime (e.g. ActionProvider) and injected into prompts
 * automatically so the LLM knows about them.
 */
export interface BuiltInAction {
  /** Action name (e.g. "setState") */
  name: string;
  /** Human-readable description for the LLM */
  description: string;
}

/**
 * Schema options
 */
export interface SchemaOptions<TCatalog = unknown> {
  /** Custom prompt template for this schema */
  promptTemplate?: PromptTemplate<TCatalog>;
  /** Default rules baked into the schema (injected before customRules in prompts) */
  defaultRules?: string[];
  /**
   * Built-in actions that are always available regardless of catalog configuration.
   * These are injected into prompts automatically so the LLM knows about them,
   * but they don't require handlers in defineRegistry because the runtime
   * (e.g. ActionProvider) handles them directly.
   */
  builtInActions?: BuiltInAction[];
}

/**
 * Spec validation result
 */
export interface SpecValidationResult<T> {
  success: boolean;
  data?: T;
  error?: z.ZodError;
}

// =============================================================================
// Catalog Type Inference Helpers
// =============================================================================

/**
 * Extract the components map type from a catalog
 * @example type Components = InferCatalogComponents<typeof myCatalog>;
 */
export type InferCatalogComponents<C extends Catalog> =
  C extends Catalog<SchemaDefinition, infer TCatalog>
    ? TCatalog extends { components: infer Comps }
      ? Comps
      : never
    : never;

/**
 * Extract the actions map type from a catalog
 * @example type Actions = InferCatalogActions<typeof myCatalog>;
 */
export type InferCatalogActions<C extends Catalog> =
  C extends Catalog<SchemaDefinition, infer TCatalog>
    ? TCatalog extends { actions: infer Acts }
      ? Acts
      : never
    : never;

/**
 * Infer component props from a catalog by component name
 * @example type ButtonProps = InferComponentProps<typeof myCatalog, 'Button'>;
 */
export type InferComponentProps<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = InferCatalogComponents<C>[K] extends { props: z.ZodType<infer P> }
  ? P
  : never;

/**
 * Infer action params from a catalog by action name
 * @example type ViewCustomersParams = InferActionParams<typeof myCatalog, 'viewCustomers'>;
 */
export type InferActionParams<
  C extends Catalog,
  K extends keyof InferCatalogActions<C>,
> = InferCatalogActions<C>[K] extends { params: z.ZodType<infer P> }
  ? P
  : never;

// =============================================================================
// Internal Type Inference Helpers
// =============================================================================

export type InferCatalogInput<T> =
  T extends SchemaType<"object", infer Shape>
    ? { [K in keyof Shape]: InferCatalogField<Shape[K]> }
    : never;

type InferCatalogField<T> =
  T extends SchemaType<"map", infer EntryShape>
    ? Record<
        string,
        // Only 'props' is required, rest are optional
        InferMapEntryRequired<EntryShape> &
          Partial<InferMapEntryOptional<EntryShape>>
      >
    : T extends SchemaType<"zod">
      ? z.ZodType
      : T extends SchemaType<"string">
        ? string
        : T extends SchemaType<"number">
          ? number
          : T extends SchemaType<"boolean">
            ? boolean
            : T extends SchemaType<"array", infer Item>
              ? InferCatalogField<Item>[]
              : T extends SchemaType<"object", infer Shape>
                ? { [K in keyof Shape]: InferCatalogField<Shape[K]> }
                : unknown;

// Extract required fields (props is always required)
type InferMapEntryRequired<T> = {
  [K in keyof T as K extends "props" ? K : never]: InferMapEntryField<T[K]>;
};

// Extract optional fields (everything except props)
type InferMapEntryOptional<T> = {
  [K in keyof T as K extends "props" ? never : K]: InferMapEntryField<T[K]>;
};

type InferMapEntryField<T> =
  T extends SchemaType<"zod">
    ? z.ZodType
    : T extends SchemaType<"string">
      ? string
      : T extends SchemaType<"number">
        ? number
        : T extends SchemaType<"boolean">
          ? boolean
          : T extends SchemaType<"array", infer Item>
            ? InferMapEntryField<Item>[]
            : T extends SchemaType<"object", infer Shape>
              ? { [K in keyof Shape]: InferMapEntryField<Shape[K]> }
              : unknown;

// Spec inference (simplified - will be expanded)
export type InferSpec<TDef extends SchemaDefinition, TCatalog> = TDef extends {
  spec: SchemaType<"object", infer Shape>;
}
  ? InferSpecObject<Shape, TCatalog>
  : unknown;

type InferSpecObject<Shape, TCatalog> = {
  [K in keyof Shape]: InferSpecField<Shape[K], TCatalog>;
};

type InferSpecField<T, TCatalog> =
  T extends SchemaType<"string">
    ? string
    : T extends SchemaType<"number">
      ? number
      : T extends SchemaType<"boolean">
        ? boolean
        : T extends SchemaType<"array", infer Item>
          ? InferSpecField<Item, TCatalog>[]
          : T extends SchemaType<"object", infer Shape>
            ? InferSpecObject<Shape, TCatalog>
            : T extends SchemaType<"record", infer Value>
              ? Record<string, InferSpecField<Value, TCatalog>>
              : T extends SchemaType<"ref", infer Path>
                ? InferRefType<Path, TCatalog>
                : T extends SchemaType<"propsOf", infer Path>
                  ? InferPropsOfType<Path, TCatalog>
                  : T extends SchemaType<"any">
                    ? unknown
                    : unknown;

type InferRefType<Path, TCatalog> = Path extends "catalog.components"
  ? TCatalog extends { components: infer C }
    ? keyof C
    : string
  : Path extends "catalog.actions"
    ? TCatalog extends { actions: infer A }
      ? keyof A
      : string
    : string;

type InferPropsOfType<Path, TCatalog> = Path extends "catalog.components"
  ? TCatalog extends { components: infer C }
    ? C extends Record<string, { props: z.ZodType<infer P> }>
      ? P
      : Record<string, unknown>
    : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Create the schema builder
 */
function createBuilder(): SchemaBuilder {
  return {
    string: () => ({ kind: "string" }),
    number: () => ({ kind: "number" }),
    boolean: () => ({ kind: "boolean" }),
    array: (item) => ({ kind: "array", inner: item }),
    object: (shape) => ({ kind: "object", inner: shape }),
    record: (value) => ({ kind: "record", inner: value }),
    any: () => ({ kind: "any" }),
    zod: () => ({ kind: "zod" }),
    ref: (path) => ({ kind: "ref", inner: path }),
    propsOf: (path) => ({ kind: "propsOf", inner: path }),
    map: (entryShape) => ({ kind: "map", inner: entryShape }),
    optional: () => ({ optional: true }),
  };
}

/**
 * Define a schema using the builder pattern
 */
export function defineSchema<TDef extends SchemaDefinition>(
  builder: (s: SchemaBuilder) => TDef,
  options?: SchemaOptions,
): Schema<TDef> {
  const s = createBuilder();
  const definition = builder(s);

  return {
    definition,
    promptTemplate: options?.promptTemplate,
    defaultRules: options?.defaultRules,
    builtInActions: options?.builtInActions,
    createCatalog<TCatalog extends InferCatalogInput<TDef["catalog"]>>(
      catalog: TCatalog,
    ): Catalog<TDef, TCatalog> {
      return createCatalogFromSchema(this as Schema<TDef>, catalog);
    },
  };
}

/**
 * Create a catalog from a schema (internal)
 */
function createCatalogFromSchema<TDef extends SchemaDefinition, TCatalog>(
  schema: Schema<TDef>,
  catalogData: TCatalog,
): Catalog<TDef, TCatalog> {
  // Extract component and action names
  const components = (catalogData as Record<string, unknown>).components as
    | Record<string, unknown>
    | undefined;
  const actions = (catalogData as Record<string, unknown>).actions as
    | Record<string, unknown>
    | undefined;

  const componentNames = components ? Object.keys(components) : [];
  const actionNames = actions ? Object.keys(actions) : [];

  // Build the Zod schema for validation
  const zodSchema = buildZodSchemaFromDefinition(
    schema.definition,
    catalogData,
  );

  return {
    schema,
    data: catalogData,
    componentNames,
    actionNames,

    prompt(options: PromptOptions = {}): string {
      return generatePrompt(this, options);
    },

    jsonSchema(): object {
      return zodToJsonSchema(zodSchema);
    },

    validate(spec: unknown): SpecValidationResult<InferSpec<TDef, TCatalog>> {
      const result = zodSchema.safeParse(spec);
      if (result.success) {
        return {
          success: true,
          data: result.data as InferSpec<TDef, TCatalog>,
        };
      }
      return { success: false, error: result.error };
    },

    zodSchema(): z.ZodType<InferSpec<TDef, TCatalog>> {
      return zodSchema as z.ZodType<InferSpec<TDef, TCatalog>>;
    },

    get _specType(): InferSpec<TDef, TCatalog> {
      throw new Error("_specType is only for type inference");
    },
  };
}

/**
 * Build Zod schema from schema definition
 */
function buildZodSchemaFromDefinition(
  definition: SchemaDefinition,
  catalogData: unknown,
): z.ZodType {
  return buildZodType(definition.spec, catalogData);
}

function buildZodType(schemaType: SchemaType, catalogData: unknown): z.ZodType {
  switch (schemaType.kind) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "any":
      return z.any();
    case "array": {
      const inner = buildZodType(schemaType.inner as SchemaType, catalogData);
      return z.array(inner);
    }
    case "object": {
      const shape = schemaType.inner as Record<string, SchemaType>;
      const zodShape: Record<string, z.ZodType> = {};
      for (const [key, value] of Object.entries(shape)) {
        let zodType = buildZodType(value, catalogData);
        if (value.optional) {
          zodType = zodType.optional();
        }
        zodShape[key] = zodType;
      }
      return z.object(zodShape);
    }
    case "record": {
      const inner = buildZodType(schemaType.inner as SchemaType, catalogData);
      return z.record(z.string(), inner);
    }
    case "ref": {
      // Reference to catalog key - create enum of valid keys
      const path = schemaType.inner as string;
      const keys = getKeysFromPath(path, catalogData);
      if (keys.length === 0) {
        return z.string();
      }
      if (keys.length === 1) {
        return z.literal(keys[0]!);
      }
      return z.enum(keys as [string, ...string[]]);
    }
    case "propsOf": {
      // Props from catalog entry - create union of all props schemas
      const path = schemaType.inner as string;
      const propsSchemas = getPropsFromPath(path, catalogData);
      if (propsSchemas.length === 0) {
        return z.record(z.string(), z.unknown());
      }
      if (propsSchemas.length === 1) {
        return propsSchemas[0]!;
      }
      // For propsOf, we need to be lenient since type determines which props apply
      return z.record(z.string(), z.unknown());
    }
    default:
      return z.unknown();
  }
}

function getKeysFromPath(path: string, catalogData: unknown): string[] {
  const parts = path.split(".");
  let current: unknown = { catalog: catalogData };
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return [];
    }
  }
  if (current && typeof current === "object") {
    return Object.keys(current);
  }
  return [];
}

function getPropsFromPath(path: string, catalogData: unknown): z.ZodType[] {
  const parts = path.split(".");
  let current: unknown = { catalog: catalogData };
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return [];
    }
  }
  if (current && typeof current === "object") {
    return Object.values(current as Record<string, { props?: z.ZodType }>)
      .map((entry) => entry.props)
      .filter((props): props is z.ZodType => props !== undefined);
  }
  return [];
}

/**
 * Generate system prompt from catalog
 */
function generatePrompt<TDef extends SchemaDefinition, TCatalog>(
  catalog: Catalog<TDef, TCatalog>,
  options: PromptOptions,
): string {
  // Check if schema has a custom prompt template
  if (catalog.schema.promptTemplate) {
    const context: PromptContext<TCatalog> = {
      catalog: catalog.data,
      componentNames: catalog.componentNames,
      actionNames: catalog.actionNames,
      options,
      formatZodType,
    };
    return catalog.schema.promptTemplate(context);
  }

  // Default JSONL element-tree format (for @json-render/react and similar)
  const {
    system = "You are a UI generator that outputs JSON.",
    customRules = [],
    mode = "generate",
  } = options;

  const lines: string[] = [];
  lines.push(system);
  lines.push("");

  // Output format section - explain JSONL streaming patch format
  if (mode === "chat") {
    lines.push("OUTPUT FORMAT (text + JSONL, RFC 6902 JSON Patch):");
    lines.push(
      "You respond conversationally. When generating UI, first write a brief explanation (1-3 sentences), then output JSONL patch lines wrapped in a ```spec code fence.",
    );
    lines.push(
      "The JSONL lines use RFC 6902 JSON Patch operations to build a UI tree. Always wrap them in a ```spec fence block:",
    );
    lines.push("  ```spec");
    lines.push('  {"op":"add","path":"/root","value":"main"}');
    lines.push(
      '  {"op":"add","path":"/elements/main","value":{"type":"Card","props":{"title":"Hello"},"children":[]}}',
    );
    lines.push("  ```");
    lines.push(
      "If the user's message does not require a UI (e.g. a greeting or clarifying question), respond with text only — no JSONL.",
    );
  } else {
    lines.push("OUTPUT FORMAT (JSONL, RFC 6902 JSON Patch):");
    lines.push(
      "Output JSONL (one JSON object per line) using RFC 6902 JSON Patch operations to build a UI tree.",
    );
  }
  lines.push(
    "Each line is a JSON patch operation (add, remove, replace). Start with /root, then stream /elements and /state patches interleaved so the UI fills in progressively as it streams.",
  );
  lines.push("");
  lines.push("Example output (each line is a separate JSON object):");
  lines.push("");

  // Build example using actual catalog component names and props to avoid hallucinations
  const allComponents = (catalog.data as Record<string, unknown>).components as
    | Record<string, CatalogComponentDef>
    | undefined;
  const cn = catalog.componentNames;
  const comp1 = cn[0] || "Component";
  const comp2 = cn.length > 1 ? cn[1]! : comp1;
  const comp1Def = allComponents?.[comp1];
  const comp2Def = allComponents?.[comp2];
  const comp1Props = comp1Def ? getExampleProps(comp1Def) : {};
  const comp2Props = comp2Def ? getExampleProps(comp2Def) : {};

  // Find a string prop on comp2 to demonstrate $state dynamic bindings
  const dynamicPropName = comp2Def?.props
    ? findFirstStringProp(comp2Def.props)
    : null;
  const dynamicProps = dynamicPropName
    ? { ...comp2Props, [dynamicPropName]: { $item: "title" } }
    : comp2Props;

  const exampleOutput = [
    JSON.stringify({ op: "add", path: "/root", value: "main" }),
    JSON.stringify({
      op: "add",
      path: "/elements/main",
      value: {
        type: comp1,
        props: comp1Props,
        children: ["child-1", "list"],
      },
    }),
    JSON.stringify({
      op: "add",
      path: "/elements/child-1",
      value: { type: comp2, props: comp2Props, children: [] },
    }),
    JSON.stringify({
      op: "add",
      path: "/elements/list",
      value: {
        type: comp1,
        props: comp1Props,
        repeat: { statePath: "/items", key: "id" },
        children: ["item"],
      },
    }),
    JSON.stringify({
      op: "add",
      path: "/elements/item",
      value: { type: comp2, props: dynamicProps, children: [] },
    }),
    JSON.stringify({ op: "add", path: "/state/items", value: [] }),
    JSON.stringify({
      op: "add",
      path: "/state/items/0",
      value: { id: "1", title: "First Item" },
    }),
    JSON.stringify({
      op: "add",
      path: "/state/items/1",
      value: { id: "2", title: "Second Item" },
    }),
  ].join("\n");

  lines.push(`${exampleOutput}

Note: state patches appear right after the elements that use them, so the UI fills in as it streams. ONLY use component types from the AVAILABLE COMPONENTS list below.`);
  lines.push("");

  // Initial state section
  lines.push("INITIAL STATE:");
  lines.push(
    "Specs include a /state field to seed the state model. Components with { $bindState } or { $bindItem } read from and write to this state, and $state expressions read from it.",
  );
  lines.push(
    "CRITICAL: You MUST include state patches whenever your UI displays data via $state, $bindState, $bindItem, $item, or $index expressions, or uses repeat to iterate over arrays. Without state, these references resolve to nothing and repeat lists render zero items.",
  );
  lines.push(
    "Output state patches right after the elements that reference them, so the UI fills in progressively as it streams.",
  );
  lines.push(
    "Stream state progressively - output one patch per array item instead of one giant blob:",
  );
  lines.push(
    '  For arrays: {"op":"add","path":"/state/posts/0","value":{"id":"1","title":"First Post",...}} then /state/posts/1, /state/posts/2, etc.',
  );
  lines.push(
    '  For scalars: {"op":"add","path":"/state/newTodoText","value":""}',
  );
  lines.push(
    '  Initialize the array first if needed: {"op":"add","path":"/state/posts","value":[]}',
  );
  lines.push(
    'When content comes from the state model, use { "$state": "/some/path" } dynamic props to display it instead of hardcoding the same value in both state and props. The state model is the single source of truth.',
  );
  lines.push(
    "Include realistic sample data in state. For blogs: 3-4 posts with titles, excerpts, authors, dates. For product lists: 3-5 items with names, prices, descriptions. Never leave arrays empty.",
  );
  lines.push("");
  lines.push("DYNAMIC LISTS (repeat field):");
  lines.push(
    'Any element can have a top-level "repeat" field to render its children once per item in a state array: { "repeat": { "statePath": "/arrayPath", "key": "id" } }.',
  );
  lines.push(
    'The element itself renders once (as the container), and its children are expanded once per array item. "statePath" is the state array path. "key" is an optional field name on each item for stable React keys.',
  );
  lines.push(
    `Example: ${JSON.stringify({ type: comp1, props: comp1Props, repeat: { statePath: "/todos", key: "id" }, children: ["todo-item"] })}`,
  );
  lines.push(
    'Inside children of a repeated element, use { "$item": "field" } to read a field from the current item, and { "$index": true } to get the current array index. For two-way binding to an item field use { "$bindItem": "completed" } on the appropriate prop.',
  );
  lines.push(
    "ALWAYS use the repeat field for lists backed by state arrays. NEVER hardcode individual elements for each array item.",
  );
  lines.push(
    'IMPORTANT: "repeat" is a top-level field on the element (sibling of type/props/children), NOT inside props.',
  );
  lines.push("");
  lines.push("ARRAY STATE ACTIONS:");
  lines.push(
    'Use action "pushState" to append items to arrays. Params: { statePath: "/arrayPath", value: { ...item }, clearStatePath: "/inputPath" }.',
  );
  lines.push(
    'Values inside pushState can contain { "$state": "/statePath" } references to read current state (e.g. the text from an input field).',
  );
  lines.push(
    'Use "$id" inside a pushState value to auto-generate a unique ID.',
  );
  lines.push(
    'Example: on: { "press": { "action": "pushState", "params": { "statePath": "/todos", "value": { "id": "$id", "title": { "$state": "/newTodoText" }, "completed": false }, "clearStatePath": "/newTodoText" } } }',
  );
  lines.push(
    'Use action "removeState" to remove items from arrays by index. Params: { statePath: "/arrayPath", index: N }. Inside a repeated element\'s children, use { "$index": true } for the current item index. Action params support the same expressions as props: { "$item": "field" } resolves to the absolute state path, { "$index": true } resolves to the index number, and { "$state": "/path" } reads a value from state.',
  );
  lines.push(
    "For lists where users can add/remove items (todos, carts, etc.), use pushState and removeState instead of hardcoding with setState.",
  );
  lines.push("");
  lines.push(
    'IMPORTANT: State paths use RFC 6901 JSON Pointer syntax (e.g. "/todos/0/title"). Do NOT use JavaScript-style dot notation (e.g. "/todos.length" is WRONG). To generate unique IDs for new items, use "$id" instead of trying to read array length.',
  );
  lines.push("");

  // Components section — reuse the typed reference from example generation
  const components = allComponents;

  if (components) {
    lines.push(`AVAILABLE COMPONENTS (${catalog.componentNames.length}):`);
    lines.push("");

    for (const [name, def] of Object.entries(components)) {
      const propsStr = def.props ? formatZodType(def.props) : "{}";
      const hasChildren = def.slots && def.slots.length > 0;
      const childrenStr = hasChildren ? " [accepts children]" : "";
      const eventsStr =
        def.events && def.events.length > 0
          ? ` [events: ${def.events.join(", ")}]`
          : "";
      const descStr = def.description ? ` - ${def.description}` : "";
      lines.push(`- ${name}: ${propsStr}${descStr}${childrenStr}${eventsStr}`);
    }
    lines.push("");
  }

  // Actions section
  const actions = (catalog.data as Record<string, unknown>).actions as
    | Record<string, { params?: z.ZodType; description?: string }>
    | undefined;

  const builtInActions = catalog.schema.builtInActions ?? [];
  const hasCustomActions = actions && catalog.actionNames.length > 0;
  const hasBuiltInActions = builtInActions.length > 0;

  if (hasCustomActions || hasBuiltInActions) {
    lines.push("AVAILABLE ACTIONS:");
    lines.push("");

    // Built-in actions (handled by runtime, always available)
    for (const action of builtInActions) {
      lines.push(`- ${action.name}: ${action.description} [built-in]`);
    }

    // Custom actions (declared in catalog, require handlers)
    if (hasCustomActions) {
      for (const [name, def] of Object.entries(actions)) {
        lines.push(`- ${name}${def.description ? `: ${def.description}` : ""}`);
      }
    }

    lines.push("");
  }

  // Events section
  lines.push("EVENTS (the `on` field):");
  lines.push(
    "Elements can have an optional `on` field to bind events to actions. The `on` field is a top-level field on the element (sibling of type/props/children), NOT inside props.",
  );
  lines.push(
    'Each key in `on` is an event name (from the component\'s supported events), and the value is an action binding: `{ "action": "<actionName>", "params": { ... } }`.',
  );
  lines.push("");
  lines.push("Example:");
  lines.push(
    `  ${JSON.stringify({ type: comp1, props: comp1Props, on: { press: { action: "setState", params: { statePath: "/saved", value: true } } }, children: [] })}`,
  );
  lines.push("");
  lines.push(
    'Action params can use dynamic references to read from state: { "$state": "/statePath" }.',
  );
  lines.push(
    "IMPORTANT: Do NOT put action/actionParams inside props. Always use the `on` field for event bindings.",
  );
  lines.push("");

  // Visibility conditions
  lines.push("VISIBILITY CONDITIONS:");
  lines.push(
    "Elements can have an optional `visible` field to conditionally show/hide based on state. IMPORTANT: `visible` is a top-level field on the element object (sibling of type/props/children), NOT inside props.",
  );
  lines.push(
    `Correct: ${JSON.stringify({ type: comp1, props: comp1Props, visible: { $state: "/activeTab", eq: "home" }, children: ["..."] })}`,
  );
  lines.push(
    '- `{ "$state": "/path" }` - visible when state at path is truthy',
  );
  lines.push(
    '- `{ "$state": "/path", "not": true }` - visible when state at path is falsy',
  );
  lines.push(
    '- `{ "$state": "/path", "eq": "value" }` - visible when state equals value',
  );
  lines.push(
    '- `{ "$state": "/path", "neq": "value" }` - visible when state does not equal value',
  );
  lines.push(
    '- `{ "$state": "/path", "gt": N }` / `gte` / `lt` / `lte` - numeric comparisons',
  );
  lines.push(
    "- Use ONE operator per condition (eq, neq, gt, gte, lt, lte). Do not combine multiple operators.",
  );
  lines.push('- Any condition can add `"not": true` to invert its result');
  lines.push(
    "- `[condition, condition]` - all conditions must be true (implicit AND)",
  );
  lines.push(
    '- `{ "$and": [condition, condition] }` - explicit AND (use when nesting inside $or)',
  );
  lines.push(
    '- `{ "$or": [condition, condition] }` - at least one must be true (OR)',
  );
  lines.push("- `true` / `false` - always visible/hidden");
  lines.push("");
  lines.push(
    "Use a component with on.press bound to setState to update state and drive visibility.",
  );
  lines.push(
    `Example: A ${comp1} with on: { "press": { "action": "setState", "params": { "statePath": "/activeTab", "value": "home" } } } sets state, then a container with visible: { "$state": "/activeTab", "eq": "home" } shows only when that tab is active.`,
  );
  lines.push("");
  lines.push(
    'For tab patterns where the first/default tab should be visible when no tab is selected yet, use $or to handle both cases: visible: { "$or": [{ "$state": "/activeTab", "eq": "home" }, { "$state": "/activeTab", "not": true }] }. This ensures the first tab is visible both when explicitly selected AND when /activeTab is not yet set.',
  );
  lines.push("");

  // Dynamic prop expressions
  lines.push("DYNAMIC PROPS:");
  lines.push(
    "Any prop value can be a dynamic expression that resolves based on state. Three forms are supported:",
  );
  lines.push("");
  lines.push(
    '1. Read-only state: `{ "$state": "/statePath" }` - resolves to the value at that state path (one-way read).',
  );
  lines.push(
    '   Example: `"color": { "$state": "/theme/primary" }` reads the color from state.',
  );
  lines.push("");
  lines.push(
    '2. Two-way binding: `{ "$bindState": "/statePath" }` - resolves to the value at the state path AND enables write-back. Use on form input props (value, checked, pressed, etc.).',
  );
  lines.push(
    '   Example: `"value": { "$bindState": "/form/email" }` binds the input value to /form/email.',
  );
  lines.push(
    '   Inside repeat scopes: `"checked": { "$bindItem": "completed" }` binds to the current item\'s completed field.',
  );
  lines.push("");
  lines.push(
    '3. Conditional: `{ "$cond": <condition>, "$then": <value>, "$else": <value> }` - evaluates the condition (same syntax as visibility conditions) and picks the matching value.',
  );
  lines.push(
    '   Example: `"color": { "$cond": { "$state": "/activeTab", "eq": "home" }, "$then": "#007AFF", "$else": "#8E8E93" }`',
  );
  lines.push("");
  lines.push(
    "Use $bindState for form inputs (text fields, checkboxes, selects, sliders, etc.) and $state for read-only data display. Inside repeat scopes, use $bindItem for form inputs bound to the current item. Use dynamic props instead of duplicating elements with opposing visible conditions when only prop values differ.",
  );
  lines.push("");
  lines.push(
    '4. Template: `{ "$template": "Hello, ${/name}!" }` - interpolates `${/path}` references in the string with values from the state model.',
  );
  lines.push(
    '   Example: `"label": { "$template": "Items: ${/cart/count} | Total: ${/cart/total}" }` renders "Items: 3 | Total: 42.00" when /cart/count is 3 and /cart/total is 42.00.',
  );
  lines.push("");

  // $computed section — only emit when catalog defines functions
  const catalogFunctions = (catalog.data as Record<string, unknown>).functions;
  if (catalogFunctions && Object.keys(catalogFunctions).length > 0) {
    lines.push(
      '5. Computed: `{ "$computed": "<functionName>", "args": { "key": <expression> } }` - calls a registered function with resolved args and returns the result.',
    );
    lines.push(
      '   Example: `"value": { "$computed": "fullName", "args": { "first": { "$state": "/form/firstName" }, "last": { "$state": "/form/lastName" } } }`',
    );
    lines.push("   Available functions:");
    for (const name of Object.keys(
      catalogFunctions as Record<string, unknown>,
    )) {
      lines.push(`   - ${name}`);
    }
    lines.push("");
  }

  // Validation section — only emit when at least one component has a `checks` prop
  const hasChecksComponents = allComponents
    ? Object.entries(allComponents).some(([, def]) => {
        if (!def.props) return false;
        const formatted = formatZodType(def.props);
        return formatted.includes("checks");
      })
    : false;

  if (hasChecksComponents) {
    lines.push("VALIDATION:");
    lines.push(
      "Form components that accept a `checks` prop support client-side validation.",
    );
    lines.push(
      'Each check is an object: { "type": "<name>", "message": "...", "args": { ... } }',
    );
    lines.push("");
    lines.push("Built-in validation types:");
    lines.push("  - required — value must be non-empty");
    lines.push("  - email — valid email format");
    lines.push('  - minLength — minimum string length (args: { "min": N })');
    lines.push('  - maxLength — maximum string length (args: { "max": N })');
    lines.push('  - pattern — match a regex (args: { "pattern": "regex" })');
    lines.push('  - min — minimum numeric value (args: { "min": N })');
    lines.push('  - max — maximum numeric value (args: { "max": N })');
    lines.push("  - numeric — value must be a number");
    lines.push("  - url — valid URL format");
    lines.push(
      '  - matches — must equal another field (args: { "other": { "$state": "/path" } })',
    );
    lines.push(
      '  - equalTo — alias for matches (args: { "other": { "$state": "/path" } })',
    );
    lines.push(
      '  - lessThan — value must be less than another field (args: { "other": { "$state": "/path" } })',
    );
    lines.push(
      '  - greaterThan — value must be greater than another field (args: { "other": { "$state": "/path" } })',
    );
    lines.push(
      '  - requiredIf — required only when another field is truthy (args: { "field": { "$state": "/path" } })',
    );
    lines.push("");
    lines.push("Example:");
    lines.push(
      '  "checks": [{ "type": "required", "message": "Email is required" }, { "type": "email", "message": "Invalid email" }]',
    );
    lines.push("");
    lines.push(
      "IMPORTANT: When using checks, the component must also have a { $bindState } or { $bindItem } on its value/checked prop for two-way binding.",
    );
    lines.push(
      "Always include validation checks on form inputs for a good user experience (e.g. required, email, minLength).",
    );
    lines.push("");
  }

  // State watchers section — only emit when actions are available (watchers
  // trigger actions, so the section is irrelevant without them).
  if (hasCustomActions || hasBuiltInActions) {
    lines.push("STATE WATCHERS:");
    lines.push(
      "Elements can have an optional `watch` field to react to state changes and trigger actions. The `watch` field is a top-level field on the element (sibling of type/props/children), NOT inside props.",
    );
    lines.push(
      "Maps state paths (JSON Pointers) to action bindings. When the value at a watched path changes, the bound actions fire automatically.",
    );
    lines.push("");
    lines.push(
      "Example (cascading select — country changes trigger city loading):",
    );
    lines.push(
      `  ${JSON.stringify({ type: "Select", props: { value: { $bindState: "/form/country" }, options: ["US", "Canada", "UK"] }, watch: { "/form/country": { action: "loadCities", params: { country: { $state: "/form/country" } } } }, children: [] })}`,
    );
    lines.push("");
    lines.push(
      "Use `watch` for cascading dependencies where changing one field should trigger side effects (loading data, resetting dependent fields, computing derived values).",
    );
    lines.push(
      "IMPORTANT: `watch` is a top-level field on the element (sibling of type/props/children), NOT inside props. Watchers only fire when the value changes, not on initial render.",
    );
    lines.push("");
  }

  // Rules
  lines.push("RULES:");
  const baseRules =
    mode === "chat"
      ? [
          "When generating UI, wrap all JSONL patches in a ```spec code fence - one JSON object per line inside the fence",
          "Write a brief conversational response before any JSONL output",
          'First set root: {"op":"add","path":"/root","value":"<root-key>"}',
          'Then add each element: {"op":"add","path":"/elements/<key>","value":{...}}',
          "Output /state patches right after the elements that use them, one per array item for progressive loading. REQUIRED whenever using $state, $bindState, $bindItem, $item, $index, or repeat.",
          "ONLY use components listed above",
          "Each element value needs: type, props, children (array of child keys)",
          "Use unique keys for the element map entries (e.g., 'header', 'metric-1', 'chart-revenue')",
        ]
      : [
          "Output ONLY JSONL patches - one JSON object per line, no markdown, no code fences",
          'First set root: {"op":"add","path":"/root","value":"<root-key>"}',
          'Then add each element: {"op":"add","path":"/elements/<key>","value":{...}}',
          "Output /state patches right after the elements that use them, one per array item for progressive loading. REQUIRED whenever using $state, $bindState, $bindItem, $item, $index, or repeat.",
          "ONLY use components listed above",
          "Each element value needs: type, props, children (array of child keys)",
          "Use unique keys for the element map entries (e.g., 'header', 'metric-1', 'chart-revenue')",
        ];
  const schemaRules = catalog.schema.defaultRules ?? [];
  const allRules = [...baseRules, ...schemaRules, ...customRules];
  allRules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });

  return lines.join("\n");
}

// =============================================================================
// Example Value Generation from Zod Schemas
// =============================================================================

/**
 * Component definition shape as it appears in catalog data
 */
interface CatalogComponentDef {
  props?: z.ZodType;
  description?: string;
  slots?: string[];
  events?: string[];
  example?: Record<string, unknown>;
}

/**
 * Get example props for a catalog component.
 * Uses the explicit `example` field if provided, otherwise generates from Zod schema.
 */
function getExampleProps(def: CatalogComponentDef): Record<string, unknown> {
  if (def.example && Object.keys(def.example).length > 0) {
    return def.example;
  }
  if (def.props) {
    return generateExamplePropsFromZod(def.props);
  }
  return {};
}

/**
 * Generate example prop values from a Zod object schema.
 * Only includes required fields to keep examples concise.
 */
function generateExamplePropsFromZod(
  schema: z.ZodType,
): Record<string, unknown> {
  if (!schema || !schema._def) return {};
  const def = schema._def as unknown as Record<string, unknown>;
  const typeName = getZodTypeName(schema);

  if (typeName !== "ZodObject" && typeName !== "object") return {};

  const shape =
    typeof def.shape === "function"
      ? (def.shape as () => Record<string, z.ZodType>)()
      : (def.shape as Record<string, z.ZodType>);
  if (!shape) return {};

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shape)) {
    const innerTypeName = getZodTypeName(value);
    // Skip optional props to keep examples concise
    if (
      innerTypeName === "ZodOptional" ||
      innerTypeName === "optional" ||
      innerTypeName === "ZodNullable" ||
      innerTypeName === "nullable"
    ) {
      continue;
    }
    result[key] = generateExampleValue(value);
  }
  return result;
}

/**
 * Generate a single example value from a Zod type.
 */
function generateExampleValue(schema: z.ZodType): unknown {
  if (!schema || !schema._def) return "...";
  const def = schema._def as unknown as Record<string, unknown>;
  const typeName = getZodTypeName(schema);

  switch (typeName) {
    case "ZodString":
    case "string":
      return "example";
    case "ZodNumber":
    case "number":
      return 0;
    case "ZodBoolean":
    case "boolean":
      return true;
    case "ZodLiteral":
    case "literal":
      return def.value;
    case "ZodEnum":
    case "enum": {
      if (Array.isArray(def.values) && def.values.length > 0)
        return def.values[0];
      if (def.entries && typeof def.entries === "object") {
        const values = Object.values(def.entries as Record<string, string>);
        return values.length > 0 ? values[0] : "example";
      }
      return "example";
    }
    case "ZodOptional":
    case "optional":
    case "ZodNullable":
    case "nullable":
    case "ZodDefault":
    case "default": {
      const inner = (def.innerType as z.ZodType) ?? (def.wrapped as z.ZodType);
      return inner ? generateExampleValue(inner) : null;
    }
    case "ZodArray":
    case "array":
      return [];
    case "ZodObject":
    case "object":
      return generateExamplePropsFromZod(schema);
    case "ZodUnion":
    case "union": {
      const options = def.options as z.ZodType[] | undefined;
      return options && options.length > 0
        ? generateExampleValue(options[0]!)
        : "...";
    }
    default:
      return "...";
  }
}

/**
 * Find the name of the first required string prop in a Zod object schema.
 * Used to demonstrate $state dynamic bindings in examples.
 */
function findFirstStringProp(schema?: z.ZodType): string | null {
  if (!schema || !schema._def) return null;
  const def = schema._def as unknown as Record<string, unknown>;
  const typeName = getZodTypeName(schema);

  if (typeName !== "ZodObject" && typeName !== "object") return null;

  const shape =
    typeof def.shape === "function"
      ? (def.shape as () => Record<string, z.ZodType>)()
      : (def.shape as Record<string, z.ZodType>);
  if (!shape) return null;

  for (const [key, value] of Object.entries(shape)) {
    const innerTypeName = getZodTypeName(value);
    // Skip optional props
    if (
      innerTypeName === "ZodOptional" ||
      innerTypeName === "optional" ||
      innerTypeName === "ZodNullable" ||
      innerTypeName === "nullable"
    ) {
      continue;
    }
    // Unwrap to check the actual type
    if (innerTypeName === "ZodString" || innerTypeName === "string") {
      return key;
    }
  }
  return null;
}

// =============================================================================
// Zod Introspection Helpers
// =============================================================================

/**
 * Get Zod type name from schema (handles different Zod versions)
 */
function getZodTypeName(schema: z.ZodType): string {
  if (!schema || !schema._def) return "";
  const def = schema._def as unknown as Record<string, unknown>;
  // Zod 4+ uses _def.type, older versions use _def.typeName
  return (def.typeName as string) ?? (def.type as string) ?? "";
}

/**
 * Format a Zod type into a human-readable string
 */
function formatZodType(schema: z.ZodType): string {
  if (!schema || !schema._def) return "unknown";
  const def = schema._def as unknown as Record<string, unknown>;
  const typeName = getZodTypeName(schema);

  switch (typeName) {
    case "ZodString":
    case "string":
      return "string";
    case "ZodNumber":
    case "number":
      return "number";
    case "ZodBoolean":
    case "boolean":
      return "boolean";
    case "ZodLiteral":
    case "literal":
      return JSON.stringify(def.value);
    case "ZodEnum":
    case "enum": {
      // Zod 3 uses values array, Zod 4 uses entries object
      let values: string[];
      if (Array.isArray(def.values)) {
        values = def.values as string[];
      } else if (def.entries && typeof def.entries === "object") {
        values = Object.values(def.entries as Record<string, string>);
      } else {
        return "enum";
      }
      return values.map((v) => `"${v}"`).join(" | ");
    }
    case "ZodArray":
    case "array": {
      // safely resolve inner type for Zod arrays
      const inner = (
        typeof def.element === "object"
          ? def.element
          : typeof def.type === "object"
            ? def.type
            : undefined
      ) as z.ZodType | undefined;
      return inner ? `Array<${formatZodType(inner)}>` : "Array<unknown>";
    }
    case "ZodObject":
    case "object": {
      // Shape can be a function (Zod 3) or direct object (Zod 4)
      const shape =
        typeof def.shape === "function"
          ? (def.shape as () => Record<string, z.ZodType>)()
          : (def.shape as Record<string, z.ZodType>);
      if (!shape) return "object";
      const props = Object.entries(shape)
        .map(([key, value]) => {
          const innerTypeName = getZodTypeName(value);
          const isOptional =
            innerTypeName === "ZodOptional" ||
            innerTypeName === "ZodNullable" ||
            innerTypeName === "optional" ||
            innerTypeName === "nullable";
          return `${key}${isOptional ? "?" : ""}: ${formatZodType(value)}`;
        })
        .join(", ");
      return `{ ${props} }`;
    }
    case "ZodOptional":
    case "optional":
    case "ZodNullable":
    case "nullable": {
      const inner = (def.innerType as z.ZodType) ?? (def.wrapped as z.ZodType);
      return inner ? formatZodType(inner) : "unknown";
    }
    case "ZodUnion":
    case "union": {
      const options = def.options as z.ZodType[] | undefined;
      return options
        ? options.map((opt) => formatZodType(opt)).join(" | ")
        : "unknown";
    }
    default:
      return "unknown";
  }
}

/**
 * Convert Zod schema to JSON Schema
 */
function zodToJsonSchema(schema: z.ZodType): object {
  // Simplified JSON Schema conversion
  const def = schema._def as unknown as Record<string, unknown>;
  const typeName = (def.typeName as string) ?? "";

  switch (typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodLiteral":
      return { const: def.value };
    case "ZodEnum":
      return { enum: def.values };
    case "ZodArray": {
      const inner = def.type as z.ZodType | undefined;
      return {
        type: "array",
        items: inner ? zodToJsonSchema(inner) : {},
      };
    }
    case "ZodObject": {
      const shape = (def.shape as () => Record<string, z.ZodType>)?.();
      if (!shape) return { type: "object" };
      const properties: Record<string, object> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value);
        const innerDef = value._def as unknown as Record<string, unknown>;
        if (
          innerDef.typeName !== "ZodOptional" &&
          innerDef.typeName !== "ZodNullable"
        ) {
          required.push(key);
        }
      }
      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
        additionalProperties: false,
      };
    }
    case "ZodRecord": {
      const valueType = def.valueType as z.ZodType | undefined;
      return {
        type: "object",
        additionalProperties: valueType ? zodToJsonSchema(valueType) : true,
      };
    }
    case "ZodOptional":
    case "ZodNullable": {
      const inner = def.innerType as z.ZodType | undefined;
      return inner ? zodToJsonSchema(inner) : {};
    }
    case "ZodUnion": {
      const options = def.options as z.ZodType[] | undefined;
      return options ? { anyOf: options.map(zodToJsonSchema) } : {};
    }
    case "ZodAny":
      return {};
    default:
      return {};
  }
}

/**
 * Shorthand: Define a catalog directly from a schema
 */
export function defineCatalog<
  TDef extends SchemaDefinition,
  TCatalog extends InferCatalogInput<TDef["catalog"]>,
>(schema: Schema<TDef>, catalog: TCatalog): Catalog<TDef, TCatalog> {
  return schema.createCatalog(catalog);
}

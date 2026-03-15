import { stringify } from "yaml";
import type { Catalog, EditMode, SchemaDefinition } from "@json-render/core";
import { buildEditInstructions } from "@json-render/core";

interface ZodLike {
  _def?: Record<string, unknown>;
}

export interface YamlPromptOptions {
  /** Custom system message intro. */
  system?: string;
  /**
   * - `"standalone"` (default): LLM outputs only the YAML spec (no prose).
   * - `"inline"`: LLM responds conversationally, then wraps YAML in a fence.
   */
  mode?: "standalone" | "inline";
  /** Additional rules appended to the RULES section. */
  customRules?: string[];
  /** Edit modes to document. Default: `["merge"]` (yaml-edit). */
  editModes?: EditMode[];
}

interface CatalogComponentDef {
  props?: ZodLike;
  description?: string;
  slots?: string[];
  events?: string[];
  example?: Record<string, unknown>;
}

// ── Zod introspection (local, minimal) ──────────────────────────────────────

function getZodTypeName(schema: ZodLike): string {
  if (!schema?._def) return "";
  const def = schema._def;
  return (
    (def.typeName as string | undefined) ??
    (typeof def.type === "string" ? (def.type as string) : "") ??
    ""
  );
}

function formatZodType(schema: ZodLike): string {
  if (!schema?._def) return "unknown";
  const def = schema._def;
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
      const inner = (
        typeof def.element === "object"
          ? def.element
          : typeof def.type === "object"
            ? def.type
            : undefined
      ) as ZodLike | undefined;
      return inner ? `Array<${formatZodType(inner)}>` : "Array<unknown>";
    }
    case "ZodObject":
    case "object": {
      const shape =
        typeof def.shape === "function"
          ? (def.shape as () => Record<string, ZodLike>)()
          : (def.shape as Record<string, ZodLike>);
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
      const inner = (def.innerType as ZodLike) ?? (def.wrapped as ZodLike);
      return inner ? formatZodType(inner) : "unknown";
    }
    case "ZodUnion":
    case "union": {
      const options = def.options as ZodLike[] | undefined;
      return options
        ? options.map((opt) => formatZodType(opt)).join(" | ")
        : "unknown";
    }
    default:
      return "unknown";
  }
}

function getExampleProps(def: CatalogComponentDef): Record<string, unknown> {
  if (def.example && Object.keys(def.example).length > 0) return def.example;
  if (!def.props?._def) return {};
  const zodDef = def.props._def;
  const typeName = getZodTypeName(def.props);
  if (typeName !== "ZodObject" && typeName !== "object") return {};
  const shape =
    typeof zodDef.shape === "function"
      ? (zodDef.shape as () => Record<string, ZodLike>)()
      : (zodDef.shape as Record<string, ZodLike>);
  if (!shape) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shape)) {
    const inner = getZodTypeName(value);
    if (
      inner === "ZodOptional" ||
      inner === "optional" ||
      inner === "ZodNullable" ||
      inner === "nullable"
    )
      continue;
    result[key] = exampleValue(value);
  }
  return result;
}

function exampleValue(schema: ZodLike): unknown {
  if (!schema?._def) return "...";
  const def = schema._def;
  const t = getZodTypeName(schema);
  switch (t) {
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
      if (Array.isArray(def.values) && (def.values as unknown[]).length > 0)
        return (def.values as unknown[])[0];
      if (def.entries && typeof def.entries === "object") {
        const vals = Object.values(def.entries as Record<string, string>);
        return vals.length > 0 ? vals[0] : "example";
      }
      return "example";
    }
    case "ZodOptional":
    case "optional":
    case "ZodNullable":
    case "nullable":
    case "ZodDefault":
    case "default": {
      const inner = (def.innerType as ZodLike) ?? (def.wrapped as ZodLike);
      return inner ? exampleValue(inner) : null;
    }
    case "ZodArray":
    case "array":
      return [];
    case "ZodObject":
    case "object":
      return getExampleProps({ props: schema } as CatalogComponentDef);
    case "ZodUnion":
    case "union": {
      const options = def.options as ZodLike[] | undefined;
      return options && options.length > 0 ? exampleValue(options[0]!) : "...";
    }
    default:
      return "...";
  }
}

// ── YAML helper ──

/** Render a value as an indented YAML string (2-space indent). */
function toYaml(value: unknown): string {
  return stringify(value, { indent: 2 }).trimEnd();
}

// ── Prompt generation ──

/**
 * Generate a YAML-format system prompt from any json-render catalog.
 *
 * Works with catalogs from any renderer (`@json-render/react`,
 * `@json-render/vue`, etc.) — it only reads the catalog metadata.
 *
 * @example
 * ```ts
 * import { yamlPrompt } from "@json-render/yaml";
 * const systemPrompt = yamlPrompt(catalog, { mode: "inline" });
 * ```
 */
export function yamlPrompt(
  catalog: Catalog<SchemaDefinition, unknown>,
  options?: YamlPromptOptions,
): string {
  const {
    system = "You are a UI generator that outputs YAML.",
    mode = "standalone",
    customRules = [],
    editModes = ["merge"],
  } = options ?? {};

  const lines: string[] = [];
  lines.push(system);
  lines.push("");

  // ── Output format ──

  if (mode === "inline") {
    lines.push("OUTPUT FORMAT (text + YAML):");
    lines.push(
      "You respond conversationally. When generating UI, first write a brief explanation (1-3 sentences), then output the YAML spec wrapped in a ```yaml-spec code fence.",
    );
    lines.push(
      "If the user's message does not require a UI (e.g. a greeting or clarifying question), respond with text only — no YAML.",
    );
  } else {
    lines.push("OUTPUT FORMAT (YAML):");
    lines.push(
      "Output a YAML document that describes a UI tree. Wrap it in a ```yaml-spec code fence.",
    );
  }
  lines.push("");
  lines.push(
    "The YAML document has three top-level keys: root, elements, and state (optional).",
  );
  lines.push(
    "Stream progressively — output elements one at a time so the UI fills in as you write.",
  );
  lines.push("");

  // ── Example ──

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

  const exampleSpec = {
    root: "main",
    elements: {
      main: {
        type: comp1,
        props: comp1Props,
        children: ["child-1", "list"],
      },
      "child-1": {
        type: comp2,
        props: comp2Props,
        children: [],
      },
      list: {
        type: comp1,
        props: comp1Props,
        repeat: { statePath: "/items", key: "id" },
        children: ["item"],
      },
      item: {
        type: comp2,
        props: { ...comp2Props },
        children: [],
      },
    },
    state: {
      items: [
        { id: "1", title: "First Item" },
        { id: "2", title: "Second Item" },
      ],
    },
  };

  lines.push("Example:");
  lines.push("");
  lines.push("```yaml-spec");
  lines.push(toYaml(exampleSpec));
  lines.push("```");
  lines.push("");

  // ── Edit modes (dynamic based on config) ──

  lines.push(buildEditInstructions({ modes: editModes }, "yaml"));

  // ── Initial state ──

  lines.push("INITIAL STATE:");
  lines.push(
    "The spec includes a top-level `state` key to seed the state model. Components using $state, $bindState, $bindItem, $item, or $index read from this state.",
  );
  lines.push(
    "CRITICAL: You MUST include state whenever your UI displays data via these expressions or uses repeat to iterate over arrays.",
  );
  lines.push(
    "Include realistic sample data. For lists: 3-5 items with relevant fields. Never leave arrays empty.",
  );
  lines.push(
    'When content comes from the state model, use { "$state": "/some/path" } dynamic props instead of hardcoding values.',
  );
  lines.push(
    'State paths use RFC 6901 JSON Pointer syntax (e.g. "/todos/0/title"). Do NOT use dot notation.',
  );
  lines.push("");

  // ── Dynamic lists ──

  lines.push("DYNAMIC LISTS (repeat field):");
  lines.push(
    "Any element can have a top-level `repeat` field to render its children once per item in a state array.",
  );
  lines.push("Example:");
  lines.push("");
  lines.push(
    toYaml({
      list: {
        type: comp1,
        props: comp1Props,
        repeat: { statePath: "/todos", key: "id" },
        children: ["todo-item"],
      },
    }),
  );
  lines.push("");
  lines.push(
    'Inside repeated children, use { "$item": "field" } for item data and { "$index": true } for the array index.',
  );
  lines.push(
    "ALWAYS use repeat for lists backed by state arrays. NEVER hardcode individual elements per item.",
  );
  lines.push(
    "IMPORTANT: `repeat` is a top-level field on the element (sibling of type/props/children), NOT inside props.",
  );
  lines.push("");

  // ── Array state actions ──

  lines.push("ARRAY STATE ACTIONS:");
  lines.push(
    'Use "pushState" to append items to arrays. Use "removeState" to remove items by index.',
  );
  lines.push('Use "$id" inside pushState values to auto-generate a unique ID.');
  lines.push("");

  // ── Components ──

  if (allComponents) {
    lines.push(`AVAILABLE COMPONENTS (${catalog.componentNames.length}):`);
    lines.push("");

    for (const [name, def] of Object.entries(allComponents)) {
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

  // ── Actions ──

  const actions = (catalog.data as Record<string, unknown>).actions as
    | Record<string, { params?: ZodLike; description?: string }>
    | undefined;
  const builtInActions = catalog.schema.builtInActions ?? [];
  const hasCustomActions = actions && catalog.actionNames.length > 0;
  const hasBuiltInActions = builtInActions.length > 0;

  if (hasCustomActions || hasBuiltInActions) {
    lines.push("AVAILABLE ACTIONS:");
    lines.push("");
    for (const action of builtInActions) {
      lines.push(`- ${action.name}: ${action.description} [built-in]`);
    }
    if (hasCustomActions) {
      for (const [name, def] of Object.entries(actions)) {
        lines.push(`- ${name}${def.description ? `: ${def.description}` : ""}`);
      }
    }
    lines.push("");
  }

  // ── Events ──

  lines.push("EVENTS (the `on` field):");
  lines.push(
    "Elements can have an optional `on` field to bind events to actions. It is a top-level field (sibling of type/props/children), NOT inside props.",
  );
  lines.push("Example:");
  lines.push("");
  lines.push(
    toYaml({
      "save-btn": {
        type: comp1,
        props: comp1Props,
        on: {
          press: {
            action: "setState",
            params: { statePath: "/saved", value: true },
          },
        },
        children: [],
      },
    }),
  );
  lines.push("");
  lines.push(
    'Action params can use dynamic references: { "$state": "/statePath" }.',
  );
  lines.push(
    "IMPORTANT: Do NOT put action/actionParams inside props. Always use the `on` field.",
  );
  lines.push("");

  // ── Visibility ──

  lines.push("VISIBILITY CONDITIONS:");
  lines.push(
    "Elements can have an optional `visible` field to conditionally show/hide based on state. It is a top-level field (sibling of type/props/children).",
  );
  lines.push("Conditions:");
  lines.push('- { "$state": "/path" } — visible when truthy');
  lines.push('- { "$state": "/path", "not": true } — visible when falsy');
  lines.push('- { "$state": "/path", "eq": "value" } — visible when equal');
  lines.push(
    '- { "$state": "/path", "neq": "value" } — visible when not equal',
  );
  lines.push(
    '- { "$state": "/path", "gt": N } / gte / lt / lte — numeric comparisons',
  );
  lines.push("- Use ONE operator per condition. Do not combine multiple.");
  lines.push('- Add "not": true to any condition to invert it.');
  lines.push("- [cond, cond] — implicit AND (all must be true)");
  lines.push('- { "$and": [...] } — explicit AND');
  lines.push('- { "$or": [...] } — at least one must be true');
  lines.push("- true / false — always visible/hidden");
  lines.push("");

  // ── Dynamic props ──

  lines.push("DYNAMIC PROPS:");
  lines.push("Any prop value can be a dynamic expression:");
  lines.push(
    '1. Read-only: { "$state": "/path" } — resolves to the value at that state path.',
  );
  lines.push(
    '2. Two-way binding: { "$bindState": "/path" } — read + write. Use on form inputs.',
  );
  lines.push(
    '   Inside repeat scopes: { "$bindItem": "field" } for item-level binding.',
  );
  lines.push(
    '3. Conditional: { "$cond": <condition>, "$then": <val>, "$else": <val> }',
  );
  lines.push(
    '4. Template: { "$template": "Hello, ${/name}!" } — interpolates state references.',
  );
  lines.push("");

  // ── $computed (only if catalog has functions) ──

  const catalogFunctions = (catalog.data as Record<string, unknown>).functions;
  if (catalogFunctions && Object.keys(catalogFunctions).length > 0) {
    lines.push(
      '5. Computed: { "$computed": "<fn>", "args": { "key": <expr> } }',
    );
    lines.push("   Available functions:");
    for (const name of Object.keys(
      catalogFunctions as Record<string, unknown>,
    )) {
      lines.push(`   - ${name}`);
    }
    lines.push("");
  }

  // ── Validation (only if components have checks) ──

  const hasChecks = allComponents
    ? Object.values(allComponents).some((def) => {
        if (!def.props) return false;
        return formatZodType(def.props).includes("checks");
      })
    : false;

  if (hasChecks) {
    lines.push("VALIDATION:");
    lines.push(
      "Form components with a `checks` prop support client-side validation.",
    );
    lines.push(
      "Built-in types: required, email, minLength, maxLength, pattern, min, max, numeric, url, matches, equalTo, lessThan, greaterThan, requiredIf.",
    );
    lines.push(
      "IMPORTANT: Components with checks must also use $bindState or $bindItem for two-way binding.",
    );
    lines.push("");
  }

  // ── State watchers ──

  if (hasCustomActions || hasBuiltInActions) {
    lines.push("STATE WATCHERS:");
    lines.push(
      "Elements can have an optional `watch` field to trigger actions when state changes. Top-level field, NOT inside props.",
    );
    lines.push(
      "Maps state paths to action bindings. Fires when the watched value changes (not on initial render).",
    );
    lines.push("");
  }

  // ── Rules ──

  lines.push("RULES:");
  const baseRules =
    mode === "inline"
      ? [
          "When generating UI, wrap the YAML in a ```yaml-spec code fence",
          "Write a brief conversational response before the YAML",
          "When editing existing UI, use a ```yaml-edit fence with only the changed parts",
          "The document must have: root (string), elements (map of elements), and optionally state",
          "Each element must have: type, props, children (list of child keys)",
          "ONLY use components listed above",
          "Use unique, descriptive keys for elements (e.g. 'header', 'metric-1', 'chart-revenue')",
          "Include state whenever using $state, $bindState, $bindItem, $item, $index, or repeat",
        ]
      : [
          "Output ONLY the YAML spec inside a ```yaml-spec fence — no prose, no extra markdown",
          "When editing existing UI, use a ```yaml-edit fence with only the changed parts",
          "The document must have: root (string), elements (map of elements), and optionally state",
          "Each element must have: type, props, children (list of child keys)",
          "ONLY use components listed above",
          "Use unique, descriptive keys for elements (e.g. 'header', 'metric-1', 'chart-revenue')",
          "Include state whenever using $state, $bindState, $bindItem, $item, $index, or repeat",
        ];

  const schemaRules = catalog.schema.defaultRules ?? [];
  const allRules = [...baseRules, ...schemaRules, ...customRules];
  allRules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });

  return lines.join("\n");
}

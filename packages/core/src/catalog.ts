import { z } from "zod";
import type {
  ComponentSchema,
  ValidationMode,
  UIElement,
  UITree,
  VisibilityCondition,
} from "./types";
import { VisibilityConditionSchema } from "./visibility";
import { ActionSchema, type ActionDefinition } from "./actions";
import { ValidationConfigSchema, type ValidationFunction } from "./validation";

/**
 * Component definition with visibility and validation support
 */
export interface ComponentDefinition<
  TProps extends ComponentSchema = ComponentSchema,
> {
  /** Zod schema for component props */
  props: TProps;
  /** Whether this component can have children */
  hasChildren?: boolean;
  /** Description for AI generation */
  description?: string;
}

/**
 * Catalog configuration
 */
export interface CatalogConfig<
  TComponents extends Record<string, ComponentDefinition> = Record<
    string,
    ComponentDefinition
  >,
  TActions extends Record<string, ActionDefinition> = Record<
    string,
    ActionDefinition
  >,
  TFunctions extends Record<string, ValidationFunction> = Record<
    string,
    ValidationFunction
  >,
> {
  /** Catalog name */
  name?: string;
  /** Component definitions */
  components: TComponents;
  /** Action definitions with param schemas */
  actions?: TActions;
  /** Custom validation functions */
  functions?: TFunctions;
  /** Validation mode */
  validation?: ValidationMode;
}

/**
 * Catalog instance
 */
export interface Catalog<
  TComponents extends Record<string, ComponentDefinition> = Record<
    string,
    ComponentDefinition
  >,
  TActions extends Record<string, ActionDefinition> = Record<
    string,
    ActionDefinition
  >,
  TFunctions extends Record<string, ValidationFunction> = Record<
    string,
    ValidationFunction
  >,
> {
  /** Catalog name */
  readonly name: string;
  /** Component names */
  readonly componentNames: (keyof TComponents)[];
  /** Action names */
  readonly actionNames: (keyof TActions)[];
  /** Function names */
  readonly functionNames: (keyof TFunctions)[];
  /** Validation mode */
  readonly validation: ValidationMode;
  /** Component definitions */
  readonly components: TComponents;
  /** Action definitions */
  readonly actions: TActions;
  /** Custom validation functions */
  readonly functions: TFunctions;
  /** Full element schema for AI generation */
  readonly elementSchema: z.ZodType<UIElement>;
  /** Full UI tree schema */
  readonly treeSchema: z.ZodType<UITree>;
  /** Check if component exists */
  hasComponent(type: string): boolean;
  /** Check if action exists */
  hasAction(name: string): boolean;
  /** Check if function exists */
  hasFunction(name: string): boolean;
  /** Validate an element */
  validateElement(element: unknown): {
    success: boolean;
    data?: UIElement;
    error?: z.ZodError;
  };
  /** Validate a UI tree */
  validateTree(tree: unknown): {
    success: boolean;
    data?: UITree;
    error?: z.ZodError;
  };
}

/**
 * Create a v2 catalog with visibility, actions, and validation support
 */
export function createCatalog<
  TComponents extends Record<string, ComponentDefinition>,
  TActions extends Record<string, ActionDefinition> = Record<
    string,
    ActionDefinition
  >,
  TFunctions extends Record<string, ValidationFunction> = Record<
    string,
    ValidationFunction
  >,
>(
  config: CatalogConfig<TComponents, TActions, TFunctions>,
): Catalog<TComponents, TActions, TFunctions> {
  const {
    name = "unnamed",
    components,
    actions = {} as TActions,
    functions = {} as TFunctions,
    validation = "strict",
  } = config;

  const componentNames = Object.keys(components) as (keyof TComponents)[];
  const actionNames = Object.keys(actions) as (keyof TActions)[];
  const functionNames = Object.keys(functions) as (keyof TFunctions)[];

  // Create element schema for each component type
  const componentSchemas = componentNames.map((componentName) => {
    const def = components[componentName]!;

    return z.object({
      key: z.string(),
      type: z.literal(componentName as string),
      props: def.props,
      children: z.array(z.string()).optional(),
      parentKey: z.string().nullable().optional(),
      visible: VisibilityConditionSchema.optional(),
    });
  });

  // Create union schema for all components
  let elementSchema: z.ZodType<UIElement>;

  if (componentSchemas.length === 0) {
    elementSchema = z.object({
      key: z.string(),
      type: z.string(),
      props: z.record(z.string(), z.unknown()),
      children: z.array(z.string()).optional(),
      parentKey: z.string().nullable().optional(),
      visible: VisibilityConditionSchema.optional(),
    }) as unknown as z.ZodType<UIElement>;
  } else if (componentSchemas.length === 1) {
    elementSchema = componentSchemas[0] as unknown as z.ZodType<UIElement>;
  } else {
    elementSchema = z.discriminatedUnion("type", [
      componentSchemas[0] as z.ZodObject<any>,
      componentSchemas[1] as z.ZodObject<any>,
      ...(componentSchemas.slice(2) as z.ZodObject<any>[]),
    ]) as unknown as z.ZodType<UIElement>;
  }

  // Create tree schema
  const treeSchema = z.object({
    root: z.string(),
    elements: z.record(z.string(), elementSchema),
  }) as unknown as z.ZodType<UITree>;

  return {
    name,
    componentNames,
    actionNames,
    functionNames,
    validation,
    components,
    actions,
    functions,
    elementSchema,
    treeSchema,

    hasComponent(type: string) {
      return type in components;
    },

    hasAction(name: string) {
      return name in actions;
    },

    hasFunction(name: string) {
      return name in functions;
    },

    validateElement(element: unknown) {
      const result = elementSchema.safeParse(element);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    },

    validateTree(tree: unknown) {
      const result = treeSchema.safeParse(tree);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    },
  };
}

/**
 * Generate a prompt for AI that describes the catalog
 */
export function generateCatalogPrompt<
  TComponents extends Record<string, ComponentDefinition>,
  TActions extends Record<string, ActionDefinition>,
  TFunctions extends Record<string, ValidationFunction>,
>(catalog: Catalog<TComponents, TActions, TFunctions>): string {
  const lines: string[] = [
    `# ${catalog.name} Component Catalog`,
    "",
    "## Available Components",
    "",
  ];

  // Components
  for (const name of catalog.componentNames) {
    const def = catalog.components[name]!;
    lines.push(`### ${String(name)}`);
    if (def.description) {
      lines.push(def.description);
    }
    lines.push("");
  }

  // Actions
  if (catalog.actionNames.length > 0) {
    lines.push("## Available Actions");
    lines.push("");
    for (const name of catalog.actionNames) {
      const def = catalog.actions[name]!;
      lines.push(
        `- \`${String(name)}\`${def.description ? `: ${def.description}` : ""}`,
      );
    }
    lines.push("");
  }

  // Visibility
  lines.push("## Visibility Conditions");
  lines.push("");
  lines.push("Components can have a `visible` property:");
  lines.push("- `true` / `false` - Always visible/hidden");
  lines.push('- `{ "path": "/data/path" }` - Visible when path is truthy');
  lines.push('- `{ "auth": "signedIn" }` - Visible when user is signed in');
  lines.push('- `{ "and": [...] }` - All conditions must be true');
  lines.push('- `{ "or": [...] }` - Any condition must be true');
  lines.push('- `{ "not": {...} }` - Negates a condition');
  lines.push('- `{ "eq": [a, b] }` - Equality check');
  lines.push("");

  // Validation
  lines.push("## Validation Functions");
  lines.push("");
  lines.push(
    "Built-in: `required`, `email`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `url`",
  );
  if (catalog.functionNames.length > 0) {
    lines.push(`Custom: ${catalog.functionNames.map(String).join(", ")}`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Type helper to infer component props from catalog
 */
export type InferCatalogComponentProps<
  C extends Catalog<Record<string, ComponentDefinition>>,
> = {
  [K in keyof C["components"]]: z.infer<C["components"][K]["props"]>;
};

/**
 * Internal Zod definition type for introspection
 */
interface ZodDefInternal {
  typeName?: string;
  value?: unknown;
  values?: unknown;
  type?: z.ZodTypeAny;
  shape?: () => Record<string, z.ZodTypeAny>;
  innerType?: z.ZodTypeAny;
  options?: z.ZodTypeAny[];
}

/**
 * Format a Zod type into a human-readable string for prompts
 */
function formatZodType(schema: z.ZodTypeAny, isOptional = false): string {
  const def = schema._def as unknown as ZodDefInternal;
  const typeName = def.typeName ?? "";

  let result: string;

  switch (typeName) {
    case "ZodString":
      result = "string";
      break;
    case "ZodNumber":
      result = "number";
      break;
    case "ZodBoolean":
      result = "boolean";
      break;
    case "ZodLiteral":
      result = JSON.stringify(def.value);
      break;
    case "ZodEnum":
      result = (def.values as string[]).map((v) => `"${v}"`).join("|");
      break;
    case "ZodNativeEnum":
      result = Object.values(def.values as Record<string, string>)
        .map((v) => `"${v}"`)
        .join("|");
      break;
    case "ZodArray":
      result = def.type
        ? `Array<${formatZodType(def.type)}>`
        : "Array<unknown>";
      break;
    case "ZodObject": {
      if (!def.shape) {
        result = "object";
        break;
      }
      const shape = def.shape();
      const props = Object.entries(shape)
        .map(([key, value]) => {
          const innerDef = value._def as unknown as ZodDefInternal;
          const innerOptional =
            innerDef.typeName === "ZodOptional" ||
            innerDef.typeName === "ZodNullable";
          return `${key}${innerOptional ? "?" : ""}: ${formatZodType(value)}`;
        })
        .join(", ");
      result = `{ ${props} }`;
      break;
    }
    case "ZodOptional":
      return def.innerType ? formatZodType(def.innerType, true) : "unknown?";
    case "ZodNullable":
      return def.innerType ? formatZodType(def.innerType, true) : "unknown?";
    case "ZodDefault":
      return def.innerType
        ? formatZodType(def.innerType, isOptional)
        : "unknown";
    case "ZodUnion":
      result = def.options
        ? def.options.map((opt) => formatZodType(opt)).join("|")
        : "unknown";
      break;
    case "ZodNull":
      result = "null";
      break;
    case "ZodUndefined":
      result = "undefined";
      break;
    case "ZodAny":
      result = "any";
      break;
    case "ZodUnknown":
      result = "unknown";
      break;
    default:
      result = "unknown";
  }

  return isOptional ? `${result}?` : result;
}

/**
 * Extract props from a Zod object schema as formatted entries
 */
function extractPropsFromSchema(
  schema: z.ZodTypeAny,
): Array<{ name: string; type: string; optional: boolean }> {
  const def = schema._def as unknown as ZodDefInternal;
  const typeName = def.typeName ?? "";

  if (typeName !== "ZodObject" || !def.shape) {
    return [];
  }

  const shape = def.shape();
  return Object.entries(shape).map(([name, value]) => {
    const innerDef = value._def as unknown as ZodDefInternal;
    const optional =
      innerDef.typeName === "ZodOptional" ||
      innerDef.typeName === "ZodNullable";
    return {
      name,
      type: formatZodType(value),
      optional,
    };
  });
}

/**
 * Format component props as a compact object notation
 */
function formatPropsCompact(
  props: Array<{ name: string; type: string; optional: boolean }>,
): string {
  if (props.length === 0) return "{}";
  const entries = props.map(
    (p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`,
  );
  return `{ ${entries.join(", ")} }`;
}

/**
 * Options for generating system prompts
 */
export interface SystemPromptOptions {
  /** System message intro (replaces default) */
  system?: string;
  /** Additional rules to append to the rules section */
  customRules?: string[];
}

/**
 * Generate a complete system prompt for AI that can generate UI from a catalog.
 * This produces a ready-to-use prompt that stays in sync with the catalog definition.
 */
export function generateSystemPrompt<
  TComponents extends Record<string, ComponentDefinition>,
  TActions extends Record<string, ActionDefinition>,
  TFunctions extends Record<string, ValidationFunction>,
>(
  catalog: Catalog<TComponents, TActions, TFunctions>,
  options: SystemPromptOptions = {},
): string {
  const {
    system = "You are a UI generator that outputs JSONL (JSON Lines) patches.",
    customRules = [],
  } = options;

  const lines: string[] = [];

  // System intro
  lines.push(system);
  lines.push("");

  // Components section
  const componentCount = catalog.componentNames.length;
  lines.push(`AVAILABLE COMPONENTS (${componentCount}):`);
  lines.push("");

  for (const name of catalog.componentNames) {
    const def = catalog.components[name]!;
    const props = extractPropsFromSchema(def.props);
    const propsStr = formatPropsCompact(props);
    const hasChildrenStr = def.hasChildren ? " Has children." : "";
    const descStr = def.description ? ` ${def.description}` : "";

    lines.push(`- ${String(name)}: ${propsStr}${descStr}${hasChildrenStr}`);
  }
  lines.push("");

  // Actions section
  if (catalog.actionNames.length > 0) {
    lines.push("AVAILABLE ACTIONS:");
    lines.push("");
    for (const name of catalog.actionNames) {
      const def = catalog.actions[name]!;
      lines.push(
        `- ${String(name)}${def.description ? `: ${def.description}` : ""}`,
      );
    }
    lines.push("");
  }

  // Output format
  lines.push("OUTPUT FORMAT (JSONL):");
  lines.push('{"op":"set","path":"/root","value":"element-key"}');
  lines.push(
    '{"op":"add","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}',
  );
  lines.push("");

  // Rules
  lines.push("RULES:");
  const baseRules = [
    "First line sets /root to root element key",
    "Add elements with /elements/{key}",
    "Children array contains string keys, not objects",
    "Parent first, then children",
    "Each element needs: key, type, props",
    "ONLY use props listed above - never invent new props",
  ];
  const allRules = [...baseRules, ...customRules];
  allRules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });
  lines.push("");

  // Custom validation functions (only if catalog has them)
  if (catalog.functionNames.length > 0) {
    lines.push("CUSTOM VALIDATION FUNCTIONS:");
    lines.push(catalog.functionNames.map(String).join(", "));
    lines.push("");
  }

  // End with prompt
  lines.push("Generate JSONL:");

  return lines.join("\n");
}

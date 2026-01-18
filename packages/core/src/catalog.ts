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
 * Generate JSONL output format instructions
 */
export function generateOutputFormatInstructions(): string {
  return `## Output Format

Wrap your JSONL output in a code block:
\`\`\`jsonl
{"op":"set","path":"/root","value":"root-key"}
{"op":"add","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}
\`\`\`

No text before or after - ONLY the wrapped JSONL.

### Rules
1. First line sets /root to root element key
2. Add elements with /elements/{key}
3. Children array contains string keys, not objects
4. Parent first, then children
5. Each element needs: key, type, props

### Example
\`\`\`jsonl
{"op":"set","path":"/root","value":"main"}
{"op":"add","path":"/elements/main","value":{"key":"main","type":"Card","props":{"title":"Hello"},"children":[]}}
\`\`\`
`;
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

  return lines.join("\n") + generateOutputFormatInstructions();
}

/**
 * Type helper to infer component props from catalog
 */
export type InferCatalogComponentProps<
  C extends Catalog<Record<string, ComponentDefinition>>,
> = {
  [K in keyof C["components"]]: z.infer<C["components"][K]["props"]>;
};


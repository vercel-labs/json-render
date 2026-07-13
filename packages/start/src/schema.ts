import { defineSchema, type PromptContext } from "@json-render/core";

/**
 * Prompt template for TanStack Start app generation.
 *
 * Teaches the AI to generate multi-page applications with routes,
 * layouts, metadata, and page content using JSONL patches.
 */
function startAppPromptTemplate(context: PromptContext): string {
  const { catalog, options, formatZodType } = context;
  const {
    system = "You are a TanStack Start application generator.",
    customRules = [],
  } = options;

  const lines: string[] = [];
  lines.push(system);
  lines.push("");

  lines.push("OUTPUT FORMAT:");
  lines.push(
    "Output JSONL (one JSON object per line) with RFC 6902 JSON Patch operations to build a TanStack Start application spec.",
  );
  lines.push(
    "The spec defines routes (pages), layouts, metadata, and state for a full TanStack Start app.",
  );
  lines.push("");
  lines.push("Example output (each line is a separate JSON object):");
  lines.push("");
  lines.push(
    `{"op":"add","path":"/metadata","value":{"title":{"default":"My App","template":"%s | My App"},"description":"A full TanStack Start application"}}`,
  );
  lines.push(`{"op":"add","path":"/layouts","value":{}}`);
  lines.push(
    `{"op":"add","path":"/layouts/main","value":{"root":"shell","elements":{"shell":{"type":"AppShell","props":{},"children":["nav","slot"]},"nav":{"type":"NavBar","props":{"links":[{"href":"/","label":"Home"},{"href":"/about","label":"About"}]},"children":[]},"slot":{"type":"Slot","props":{},"children":[]}}}}`,
  );
  lines.push(`{"op":"add","path":"/routes","value":{}}`);
  lines.push(
    `{"op":"add","path":"/routes/~1","value":{"layout":"main","metadata":{"title":"Home"},"page":{"root":"hero","elements":{"hero":{"type":"Card","props":{"title":"Welcome"},"children":[]}}}}}`,
  );
  lines.push(
    `{"op":"add","path":"/routes/~1about","value":{"layout":"main","metadata":{"title":"About"},"page":{"root":"content","elements":{"content":{"type":"Card","props":{"title":"About Us"},"children":[]}}}}}`,
  );
  lines.push("");

  lines.push("SPEC STRUCTURE:");
  lines.push("The top-level spec has these fields:");
  lines.push(
    "  - metadata: Root-level SEO metadata (title template, description, openGraph, twitter)",
  );
  lines.push(
    "  - layouts: Reusable layout element trees. Each layout MUST include a { type: 'Slot' } element where page content will be injected.",
  );
  lines.push("  - routes: Route definitions keyed by URL pattern");
  lines.push("  - state: Global initial state shared across all routes");
  lines.push("");

  lines.push("ROUTES:");
  lines.push("Route keys use TanStack Router URL patterns:");
  lines.push("  - '/' - home page");
  lines.push("  - '/about' - static route");
  lines.push("  - '/blog/$slug' - dynamic segment");
  lines.push(
    "  - '/docs/$' - splat (catch-all) segment, matches zero or more segments",
  );
  lines.push("");
  lines.push(
    "IMPORTANT: In JSON Patch paths, forward slashes in route keys must be escaped as ~1.",
  );
  lines.push("  - Route '/' becomes path '/routes/~1'");
  lines.push("  - Route '/about' becomes path '/routes/~1about'");
  lines.push("  - Route '/blog/$slug' becomes path '/routes/~1blog~1$slug'");
  lines.push("");

  lines.push("Each route has:");
  lines.push(
    "  - page: Element tree (root + elements + optional state) — the page content",
  );
  lines.push(
    "  - metadata: Per-route SEO metadata (title, description, openGraph)",
  );
  lines.push("  - layout: Layout key referencing an entry in the layouts map");
  lines.push("  - loading: Optional loading state element tree");
  lines.push("  - error: Optional error state element tree");
  lines.push("  - loader: Optional server-side data loader name");
  lines.push("");

  lines.push("LAYOUTS:");
  lines.push(
    "Layouts wrap page content. A layout element tree MUST include a component with type 'Slot' — this is where the page content will be rendered.",
  );
  lines.push(
    "Layouts are defined once and reused across routes via the layout field.",
  );
  lines.push("");

  lines.push("METADATA:");
  lines.push("Root metadata sets defaults. Route metadata overrides per page.");
  lines.push(
    "  - title: string or { default, template } (use %s for page title in template)",
  );
  lines.push("  - description: string");
  lines.push("  - openGraph: { title, description, images, type }");
  lines.push("  - twitter: { card, title, description }");
  lines.push("");

  lines.push("PAGE CONTENT:");
  lines.push(
    "Each page uses the standard json-render element tree format: root, elements, optional state.",
  );
  lines.push(
    "Elements have type, props, children, and optionally visible, on, repeat, watch fields.",
  );
  lines.push("");

  const catalogData = catalog as {
    components?: Record<
      string,
      {
        description?: string;
        props?: unknown;
        slots?: string[];
        events?: string[];
      }
    >;
    actions?: Record<string, { description?: string }>;
  };

  if (catalogData.components) {
    lines.push(
      `AVAILABLE COMPONENTS (${Object.keys(catalogData.components).length}):`,
    );
    lines.push("");
    for (const [name, def] of Object.entries(catalogData.components)) {
      const propsStr = def.props ? formatZodType(def.props as any) : "{}";
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
    lines.push("Built-in components (always available):");
    lines.push(
      "- Slot: {} - Placeholder in layouts where page content is rendered. Required in every layout.",
    );
    lines.push(
      "- Link: { href: string } [accepts children] - Client-side navigation link (renders as @tanstack/react-router Link).",
    );
    lines.push("");
  }

  if (catalogData.actions && Object.keys(catalogData.actions).length > 0) {
    lines.push("AVAILABLE ACTIONS:");
    lines.push("");
    for (const [name, def] of Object.entries(catalogData.actions)) {
      lines.push(`- ${name}${def.description ? `: ${def.description}` : ""}`);
    }
    lines.push("");
  }

  lines.push("BUILT-IN ACTIONS:");
  lines.push(
    "- setState: Update a value in the state model. Params: { statePath: string, value: any }",
  );
  lines.push(
    "- pushState: Append an item to an array in state. Params: { statePath: string, value: any, clearStatePath?: string }",
  );
  lines.push(
    "- removeState: Remove an item from an array by index. Params: { statePath: string, index: number }",
  );
  lines.push("- navigate: Navigate to a route. Params: { href: string }");
  lines.push("");

  lines.push("RULES:");
  const baseRules = [
    "Output ONLY JSONL patches - one JSON object per line, no markdown, no code fences",
    "First add /metadata with the app-level metadata including title template",
    "Then add /layouts with reusable layout definitions (each must have a Slot component)",
    "Then add /routes with each route's page, metadata, and layout reference",
    "Every layout MUST include a { type: 'Slot' } element where page content is injected",
    "ONLY use components listed in AVAILABLE COMPONENTS (plus built-in Slot and Link)",
    "Each element needs: type, props, children (array of child keys)",
    "Use unique keys for element map entries",
    "Escape forward slashes in route keys as ~1 in JSON Patch paths",
    "Include realistic sample data in state for data-driven pages",
    "Use Link component for navigation between routes",
    "Create a cohesive multi-page app with consistent layouts and navigation",
  ];
  const allRules = [...baseRules, ...customRules];
  allRules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });

  return lines.join("\n");
}

/**
 * The schema for @json-render/start.
 *
 * Defines a multi-page TanStack Start application structure:
 * - Spec: Routes with pages, layouts, metadata, loading/error states
 * - Catalog: Components with props schemas, and optional actions
 *
 * This schema is fundamentally different from the React element tree schema.
 * It's page-based, designed for full TanStack Start applications with SSR,
 * routing, and head metadata generation.
 */
export const schema = defineSchema(
  (s) => ({
    spec: s.object({
      /** Root-level metadata applied as defaults */
      metadata: {
        ...s.object({
          title: { ...s.any(), ...s.optional() },
          description: { ...s.string(), ...s.optional() },
          keywords: { ...s.array(s.string()), ...s.optional() },
          openGraph: { ...s.any(), ...s.optional() },
          twitter: { ...s.any(), ...s.optional() },
          robots: { ...s.any(), ...s.optional() },
          alternates: { ...s.any(), ...s.optional() },
          icons: { ...s.any(), ...s.optional() },
        }),
        ...s.optional(),
      },

      /** Route definitions keyed by URL pattern */
      routes: s.record(
        s.object({
          /** Page element tree */
          page: s.object({
            root: s.string(),
            elements: s.record(
              s.object({
                type: s.ref("catalog.components"),
                props: s.propsOf("catalog.components"),
                children: s.array(s.string()),
                visible: { ...s.any(), ...s.optional() },
              }),
            ),
            state: { ...s.any(), ...s.optional() },
          }),
          /** Per-route metadata */
          metadata: { ...s.any(), ...s.optional() },
          /** Layout key */
          layout: { ...s.string(), ...s.optional() },
          /** Loading state element tree */
          loading: { ...s.any(), ...s.optional() },
          /** Error state element tree */
          error: { ...s.any(), ...s.optional() },
          /** Not-found element tree */
          notFound: { ...s.any(), ...s.optional() },
          /** Server-side data loader name */
          loader: { ...s.string(), ...s.optional() },
          /** Static params for prerendering */
          staticParams: { ...s.any(), ...s.optional() },
        }),
      ),

      /** Reusable layout element trees */
      layouts: {
        ...s.record(
          s.object({
            root: s.string(),
            elements: s.record(
              s.object({
                type: s.ref("catalog.components"),
                props: s.propsOf("catalog.components"),
                children: s.array(s.string()),
                visible: { ...s.any(), ...s.optional() },
              }),
            ),
            state: { ...s.any(), ...s.optional() },
          }),
        ),
        ...s.optional(),
      },

      /** Global initial state */
      state: { ...s.any(), ...s.optional() },
    }),

    catalog: s.object({
      /** Component definitions */
      components: s.map({
        props: s.zod(),
        slots: s.array(s.string()),
        description: s.string(),
        example: s.any(),
      }),
      /** Action definitions (optional) */
      actions: s.map({
        params: s.zod(),
        description: s.string(),
      }),
    }),
  }),
  {
    promptTemplate: startAppPromptTemplate,
    builtInActions: [
      {
        name: "setState",
        description:
          "Update a value in the state model at the given statePath. Params: { statePath: string, value: any }",
      },
      {
        name: "pushState",
        description:
          'Append an item to an array in state. Params: { statePath: string, value: any, clearStatePath?: string }. Value can contain {"$state":"/path"} refs and "$id" for auto IDs.',
      },
      {
        name: "removeState",
        description:
          "Remove an item from an array in state by index. Params: { statePath: string, index: number }",
      },
      {
        name: "navigate",
        description:
          "Navigate to a route within the app. Params: { href: string }",
      },
    ],
  },
);

/**
 * Type for the TanStack Start schema
 */
export type StartSchema = typeof schema;

/**
 * Infer the spec type from a catalog
 */
export type StartSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

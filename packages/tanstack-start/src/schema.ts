import { defineSchema, type PromptContext } from "@json-render/core";

function startAppPromptTemplate(context: PromptContext): string {
  const { catalog, options, formatZodType } = context;
  const {
    system = "You are a TanStack Start application generator.",
    customRules = [],
  } = options;
  const lines: string[] = [system, ""];

  lines.push("OUTPUT FORMAT:");
  lines.push(
    "Output JSONL (one JSON object per line) with RFC 6902 JSON Patch operations to build a TanStack Start application spec.",
  );
  lines.push(
    "The spec defines routes, layouts, metadata, and state for a full TanStack Start app.",
  );
  lines.push("");
  lines.push("Example output (each line is a separate JSON object):");
  lines.push("");
  lines.push(
    `{"op":"add","path":"/metadata","value":{"title":{"default":"My App","template":"%s | My App"},"description":"A TanStack Start application"}}`,
  );
  lines.push(`{"op":"add","path":"/layouts","value":{}}`);
  lines.push(
    `{"op":"add","path":"/layouts/main","value":{"root":"shell","elements":{"shell":{"type":"AppShell","props":{},"children":["nav","slot"]},"nav":{"type":"NavBar","props":{},"children":[]},"slot":{"type":"Slot","props":{},"children":[]}}}}`,
  );
  lines.push(`{"op":"add","path":"/routes","value":{}}`);
  lines.push(
    `{"op":"add","path":"/routes/~1","value":{"layout":"main","metadata":{"title":"Home"},"page":{"root":"hero","elements":{"hero":{"type":"Card","props":{"title":"Welcome"},"children":[]}}}}}`,
  );
  lines.push("");

  lines.push("SPEC STRUCTURE:");
  lines.push("- metadata: Root SEO metadata and title templates");
  lines.push(
    "- layouts: Reusable element trees with a Slot element for page content",
  );
  lines.push("- routes: Route definitions keyed by URL pattern");
  lines.push("- state: Global initial state shared by routes");
  lines.push("");

  lines.push("ROUTES:");
  lines.push("Route keys use TanStack Router URL patterns:");
  lines.push("- '/' - home page");
  lines.push("- '/about' - static route");
  lines.push("- '/blog/$slug' - dynamic segment");
  lines.push("- '/docs/$' - splat segment matching the remaining path");
  lines.push("");
  lines.push(
    "In JSON Patch paths, escape every forward slash in a route key as ~1.",
  );
  lines.push("- Route '/' becomes '/routes/~1'");
  lines.push("- Route '/about' becomes '/routes/~1about'");
  lines.push("- Route '/blog/$slug' becomes '/routes/~1blog~1$slug'");
  lines.push("");

  lines.push("Each route has:");
  lines.push("- page: Element tree with root, elements, and optional state");
  lines.push("- metadata: Route-specific SEO metadata");
  lines.push("- layout: Key in the top-level layouts map");
  lines.push("- loading, error, notFound: Optional fallback element trees");
  lines.push("- loader: Optional server loader name");
  lines.push("- staticParams: Optional params for prerendered dynamic routes");
  lines.push("");

  lines.push("PAGE ELEMENTS:");
  lines.push("- props may contain $state, $item, $index, and $computed values");
  lines.push("- on maps component events to one or more action bindings");
  lines.push("- repeat renders children for values at a state path");
  lines.push("- visible conditionally includes an element");
  lines.push("- watch runs actions when state paths change");
  lines.push(
    "- slots maps named slots to element keys; use children for default",
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
    for (const [name, definition] of Object.entries(catalogData.components)) {
      const props = definition.props
        ? formatZodType(definition.props as any)
        : "{}";
      const children = definition.slots?.length ? " [accepts children]" : "";
      const events = definition.events?.length
        ? ` [events: ${definition.events.join(", ")}]`
        : "";
      const description = definition.description
        ? ` - ${definition.description}`
        : "";
      lines.push(`${name}: ${props}${description}${children}${events}`);
    }
    lines.push("");
  }

  lines.push("BUILT-IN COMPONENTS:");
  lines.push("- Slot: Layout placeholder for page content");
  lines.push("- Link: { href: string } client-side navigation link");
  lines.push("");

  if (catalogData.actions && Object.keys(catalogData.actions).length > 0) {
    lines.push("AVAILABLE ACTIONS:");
    for (const [name, definition] of Object.entries(catalogData.actions)) {
      lines.push(
        `${name}${definition.description ? `: ${definition.description}` : ""}`,
      );
    }
    lines.push("");
  }

  lines.push("BUILT-IN ACTIONS:");
  lines.push("- setState: { statePath, value }");
  lines.push("- pushState: { statePath, value, clearStatePath? }");
  lines.push("- removeState: { statePath, index }");
  lines.push("- navigate: { href }");
  lines.push("");

  lines.push("RULES:");
  const rules = [
    "Output only JSONL patches, one JSON object per line",
    "Add metadata, then layouts, then routes",
    "Every layout must contain a Slot element",
    "Only use available components plus Slot and Link",
    "Every element must include type, props, and children",
    "Every child and named-slot key must reference an existing element",
    "Escape route-key slashes as ~1 in JSON Patch paths",
    "Use Link for navigation between routes",
    "Use repeat for lists and include realistic state data",
    "Create a cohesive application with consistent layouts",
    ...customRules,
  ];
  rules.forEach((rule, index) => lines.push(`${index + 1}. ${rule}`));

  return lines.join("\n");
}

/** The AI generation schema for full TanStack Start applications. */
export const schema = defineSchema(
  (s) => ({
    spec: s.object({
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
      routes: s.record(
        s.object({
          page: s.object({
            root: s.string(),
            elements: s.record(
              s.object({
                type: s.ref("catalog.components"),
                props: s.propsOf("catalog.components"),
                children: s.array(s.string()),
                slots: {
                  ...s.record(s.array(s.string())),
                  ...s.optional(),
                },
                visible: { ...s.any(), ...s.optional() },
                on: { ...s.any(), ...s.optional() },
                repeat: { ...s.any(), ...s.optional() },
                watch: { ...s.any(), ...s.optional() },
              }),
            ),
            state: { ...s.any(), ...s.optional() },
          }),
          metadata: { ...s.any(), ...s.optional() },
          layout: { ...s.string(), ...s.optional() },
          loading: { ...s.any(), ...s.optional() },
          error: { ...s.any(), ...s.optional() },
          notFound: { ...s.any(), ...s.optional() },
          loader: { ...s.string(), ...s.optional() },
          staticParams: { ...s.any(), ...s.optional() },
        }),
      ),
      layouts: {
        ...s.record(
          s.object({
            root: s.string(),
            elements: s.record(
              s.object({
                type: s.ref("catalog.components"),
                props: s.propsOf("catalog.components"),
                children: s.array(s.string()),
                slots: {
                  ...s.record(s.array(s.string())),
                  ...s.optional(),
                },
                visible: { ...s.any(), ...s.optional() },
                on: { ...s.any(), ...s.optional() },
                repeat: { ...s.any(), ...s.optional() },
                watch: { ...s.any(), ...s.optional() },
              }),
            ),
            state: { ...s.any(), ...s.optional() },
          }),
        ),
        ...s.optional(),
      },
      state: { ...s.any(), ...s.optional() },
    }),
    catalog: s.object({
      components: s.map({
        props: s.zod(),
        slots: s.array(s.string()),
        description: s.string(),
        example: s.any(),
      }),
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
          "Update state at a JSON Pointer. Params: { statePath, value }",
      },
      {
        name: "pushState",
        description:
          "Append to an array. Params: { statePath, value, clearStatePath? }",
      },
      {
        name: "removeState",
        description: "Remove an array item. Params: { statePath, index }",
      },
      {
        name: "navigate",
        description: "Navigate within the app. Params: { href }",
      },
    ],
  },
);

export type StartSchema = typeof schema;
export type StartSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

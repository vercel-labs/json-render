import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/astro
 *
 * SSR-first: elements are rendered to static HTML on the server.
 * Visibility conditions and prop expressions ($state, $cond) are resolved at render time.
 * Actions and interactive state bindings are not supported in the SSR pass.
 */
export const schema = defineSchema(
  (s) => ({
    spec: s.object({
      root: s.string(),
      elements: s.record(
        s.object({
          type: s.ref("catalog.components"),
          props: s.propsOf("catalog.components"),
          children: s.array(s.string()),
          visible: s.any(),
        }),
      ),
    }),

    catalog: s.object({
      components: s.map({
        props: s.zod(),
        description: s.string(),
        example: s.any(),
      }),
    }),
  }),
  {
    defaultRules: [
      // Element integrity (same as other renderers)
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
      "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",

      // Field placement
      'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"Section","props":{},"visible":{"$state":"/isOpen"},"children":[...]}.',

      // SSR-specific rules
      "This renderer produces static HTML on the server. There are no interactive actions, event handlers, or client-side state mutations.",
      "All content is rendered at request time. Use visibility conditions ($state) to conditionally show/hide sections based on server-side data.",
      "Design with semantic HTML in mind: use heading levels correctly, include alt text for images, and ensure proper document structure for SEO and accessibility.",
      "Components should produce accessible HTML: correct heading hierarchy, ARIA landmarks, alt attributes, semantic elements (<nav>, <main>, <article>, <section>, <address>, <time>).",
    ],
  },
);

export type AstroSchema = typeof schema;

export type AstroSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

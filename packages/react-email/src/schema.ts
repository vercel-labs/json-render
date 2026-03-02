import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/react-email
 *
 * Defines:
 * - Spec: A flat tree of elements with keys, types, props, and children references
 * - Catalog: Components with props schemas
 *
 * Reuses the same { root, elements } spec format as the React and React Native renderers.
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
        slots: s.array(s.string()),
        description: s.string(),
        example: s.any(),
      }),
    }),
  }),
  {
    defaultRules: [
      "The root element MUST be an Html component. Its children MUST include Head and Body components.",
      "Body should contain a Container component to constrain width (typically 600px max for email clients).",
      "All styles MUST be inline. Email clients strip <style> tags, so every component that accepts a style prop should use it for visual customization.",
      "Image src must be a fully qualified URL (absolute, not relative). For placeholder images use https://picsum.photos/{width}/{height}?random={n}.",
      "Emails are static documents. There are no interactive actions or form inputs.",
      "Use Section, Row, and Column for layout. These map to table-based email structures for maximum compatibility.",
      "Use Preview to set the preview text shown in email client inboxes before opening.",
      "Use Heading (h1-h6) and Text for all text content. Raw strings are not supported.",
      "Button renders as a link styled as a button. Always provide both text and href.",
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist.",
    ],
  },
);

export type ReactEmailSchema = typeof schema;

export type ReactEmailSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

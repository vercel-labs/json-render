import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/react-pdf
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
          visible: { ...s.any(), ...s.optional() },
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
      "The root element MUST be a Document component. Its children MUST be Page components.",
      "Every Page must specify a size (e.g. 'A4', 'LETTER') and can set orientation, margins, and background color.",
      "Use Row for horizontal layouts and Column for vertical layouts. Both support gap, align, and justify props.",
      "Table columns must define header and optionally width and align. Rows is an array of string arrays matching the column count.",
      "All text content must use Heading or Text components. Raw strings are not supported.",
      "Image src must be a fully qualified URL. For placeholder or stock images, always use https://picsum.photos/{width}/{height}?random={n} (e.g. https://picsum.photos/400/300?random=1). Never use unsplash URLs directly.",
      "PageNumber renders the current page number and total pages. Place it inside a Page.",
      "NEVER use emoji characters in any text content. The PDF font (Helvetica) does not support emojis and they will render as garbled/overlapping characters. Use plain text descriptions instead (e.g. 'Phone:' not '📞', 'Email:' not '📧').",
      "PAGE LAYOUT: Be conservative with content density. A portrait A4/LETTER page with 40pt margins fits roughly 700pt of content height. For single-page documents (flyers, posters, one-pagers), keep all content on one page using smaller font sizes (10-11), tighter gaps (4-8), less padding (10-15), and smaller images (max height 200). For multi-page documents (resumes, reports), pack content densely to avoid large blank areas at the bottom of pages. Use small margins (marginTop: 30, marginBottom: 20), tight spacing (gap: 4-6), and compact font sizes (9-11 for body text) so pages are well-filled. It is better to fit more content on fewer pages than to spread thin content across many pages.",
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist.",
    ],
  },
);

export type ReactPdfSchema = typeof schema;

export type ReactPdfSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

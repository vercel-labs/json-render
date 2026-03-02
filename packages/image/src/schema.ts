import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/image
 *
 * Defines:
 * - Spec: A flat tree of elements with keys, types, props, and children references
 * - Catalog: Components with props schemas
 *
 * Reuses the same { root, elements } spec format as the React and React PDF renderers.
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
      "The root element MUST be a Frame component. It defines the image dimensions (width, height) and background.",
      "Frame width and height determine the output image size. Common sizes: 1200x630 (OG image), 1080x1080 (social square), 1920x1080 (banner).",
      "Use Row for horizontal layouts and Column for vertical layouts. Both support gap, align, and justify props.",
      "All text content must use Heading or Text components. Raw strings are not supported.",
      "Image src must be a fully qualified URL. For placeholder images, use https://picsum.photos/{width}/{height}?random={n}.",
      "Satori renders a subset of CSS: flexbox layout, borders, backgrounds, text styling. Absolute positioning is supported via position/top/left/right/bottom.",
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist.",
    ],
  },
);

export type ImageSchema = typeof schema;

export type ImageSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

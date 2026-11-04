import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/chat
 *
 * Specs use the same flat { root, elements } format as the other renderers.
 * The root element is a Card, and every element maps to a Chat SDK card
 * element, so one spec renders on every Chat SDK adapter.
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
      "The root element MUST be a Card. Every other element is a descendant of it.",
      "Messages are static. There is no state, no repeat and no visibility logic.",
      "Pick components by the shape of the data: Fields for a few key numbers, Table for row data, Chart for a trend or a share of a whole, Actions for next steps.",
      "Text content uses markdown: **bold**, _italic_, `code` and [label](https://url). Do not use headings inside Text.",
      "Field elements MUST be children of a Fields element. Button and LinkButton elements MUST be children of an Actions element.",
      "Every series in a bar, line or area Chart has exactly one value per category, in category order.",
      'Every element MUST include a "children" array. Leaf elements use "children": [].',
    ],
  },
);

export type ChatSchema = typeof schema;

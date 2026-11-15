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
          visible: { ...s.any(), ...s.optional() },
          repeat: { ...s.any(), ...s.optional() },
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
      "The root element MUST be a Card. Every other element is a descendant of it. To group items inside the message, use Section, not another Card.",
      "State expressions, repeat and visible resolve when the card is built. Select and RadioSelect route events to bot handlers; there is no client-side state binding, so do not use $bindState or $bindItem.",
      "Pick components by the shape of the data: Fields for key numbers, Table for rows, Chart for trends, TaskList for task status, Feedback for response ratings, and Actions for next steps. Columns and Carousel contain Section or Card items; adapters without their layout hints stack the items.",
      'For a Table backed by state, set rows to { "$state": "/path" } where the path holds an array of rows (arrays or objects with one value per header).',
      "Text content uses markdown: **bold**, _italic_, `code` and [label](https://url). Do not use headings inside Text.",
      "Field elements MUST be children of Fields. Button, LinkButton, Select and RadioSelect MUST be children of Actions. TaskList holds Task elements. Choices route to bot handlers, not local state bindings.",
      "Every series in a bar, line or area Chart has exactly one value per category, in category order.",
      'Every element MUST include a "children" array. Leaf elements use "children": [].',
    ],
  },
);

export type ChatSchema = typeof schema;

import { defineSchema, type Spec } from "@json-render/core";

/**
 * Ink terminal schema definition.
 *
 * Defines the spec shape (what the AI generates) and catalog shape
 * (what the developer provides as component + action definitions).
 */
export const schema = defineSchema(
  (s) => ({
    // What the AI-generated SPEC looks like
    spec: s.object({
      /** Root element key */
      root: s.string(),
      /** Flat map of elements by key */
      elements: s.record(
        s.object({
          /** Component type from catalog */
          type: s.ref("catalog.components"),
          /** Component props */
          props: s.propsOf("catalog.components"),
          /** Child element keys (flat reference) */
          children: s.array(s.string()),
          /** Visibility condition */
          visible: s.any(),
        }),
      ),
    }),
    // What the CATALOG must provide
    catalog: s.object({
      /** Component definitions */
      components: s.map({
        /** Zod schema for component props */
        props: s.zod(),
        /** Slots for this component. Use ['default'] for children, or named slots like ['header', 'footer'] */
        slots: s.array(s.string()),
        /** Description for AI generation hints */
        description: s.string(),
        /** Example prop values used in prompt examples (auto-generated from Zod schema if omitted) */
        example: s.any(),
      }),
      /** Action definitions (optional) */
      actions: s.map({
        /** Zod schema for action params */
        params: s.zod(),
        /** Description for AI generation hints */
        description: s.string(),
      }),
    }),
  }),
  {
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
    ],
    defaultRules: [
      // Element integrity
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
      "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",
      // Field placement
      'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"<ComponentName>","props":{},"visible":{"$state":"/tab","eq":"home"},"children":[...]}.',
      'CRITICAL: The "on" field goes on the ELEMENT object, NOT inside "props". Use on.press, on.change, on.submit etc. NEVER put action/actionParams inside props.',
      // State and data
      "When the user asks for a UI that displays data (e.g. logs, tasks, metrics), ALWAYS include a state field with realistic sample data. The state field is a top-level field on the spec (sibling of root/elements).",
      'When building repeating content backed by a state array, use the "repeat" field on a container element. Example: { "type": "Box", "props": { "flexDirection": "column" }, "repeat": { "statePath": "/items", "key": "id" }, "children": ["item-row"] }. Inside repeated children, use { "$item": "field" } to read a field from the current item, and { "$index": true } for the current array index.',
      // Terminal UI design
      "This UI renders in a terminal using Ink. Use Box for layout (flexDirection, padding, gap), Text for text content. Keep designs compact and readable in monospace.",
      "Terminal UIs have limited width (~80-120 columns). Prefer vertical layouts (flexDirection: column) for main structure. Use horizontal layouts (flexDirection: row) for inline elements like badges, key-value pairs, and table rows.",
      "Use borderStyle on Box for visual grouping (single, double, round, bold). Use padding sparingly — 1 unit is usually enough.",
      "For color, use named terminal colors: red, green, yellow, blue, magenta, cyan, white, gray. Use hex colors sparingly.",
      "Always include realistic, professional-looking sample data. For lists include 3-5 items with varied content. Never leave data empty.",
      "Use Heading for section titles, Divider to separate sections, Badge for status indicators, KeyValue for labeled data, and Card for bordered groups.",
      "Use Tabs for multi-view UIs — bind the active tab to state and use visible conditions on child content to show/hide tab panels. Use MultiSelect for picking multiple items. Use ConfirmInput for yes/no prompts before destructive actions.",
      "Use Sparkline for inline trend visualization (compact, one line). Use BarChart for comparing values across categories (horizontal bars with labels). Both work well in dashboards alongside KeyValue and ProgressBar.",
    ],
  },
);

/**
 * Type alias for the Ink schema
 */
export type InkSchema = typeof schema;

/**
 * Spec type for Ink (parameterized by catalog)
 */
export type InkSpec = Spec;

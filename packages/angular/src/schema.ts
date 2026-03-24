import { defineSchema } from "@json-render/core";

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
      actions: s.map({
        params: s.zod(),
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
      {
        name: "validateForm",
        description:
          "Validate all registered form fields and write the result to state. Params: { statePath?: string }. Defaults to /formValidation. Result: { valid: boolean, errors: Record<string, string[]> }.",
      },
    ],
    defaultRules: [
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
      "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",
      'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"<ComponentName>","props":{},"visible":{"$state":"/tab","eq":"home"},"children":[...]}.',
      'CRITICAL: The "on" field goes on the ELEMENT object, NOT inside "props". Use on.press, on.change, on.submit etc. NEVER put action/actionParams inside props.',
      "When the user asks for a UI that displays data (e.g. blog posts, products, users), ALWAYS include a state field with realistic sample data. The state field is a top-level field on the spec (sibling of root/elements).",
      'When building repeating content backed by a state array (e.g. posts, products, items), use the "repeat" field on a container element. Example: { "type": "<ContainerComponent>", "props": {}, "repeat": { "statePath": "/todos", "key": "id" }, "children": ["todo-item"] }. Replace <ContainerComponent> with an appropriate component from the AVAILABLE COMPONENTS list. Inside repeated children, use { "$item": "field" } to read a field from the current item, and { "$index": true } for the current array index. For two-way binding to an item field use { "$bindItem": "completed" }. Do NOT hardcode individual elements for each array item.',
      "Design with visual hierarchy: use container components to group content, heading components for section titles, proper spacing, and status indicators. ONLY use components from the AVAILABLE COMPONENTS list.",
      "For data-rich UIs, use multi-column layout components if available. For forms and single-column content, use vertical layout components. ONLY use components from the AVAILABLE COMPONENTS list.",
      "Always include realistic, professional-looking sample data. For blogs include 3-4 posts with varied titles, authors, dates, categories. For products include names, prices, images. Never leave data empty.",
    ],
  },
);

export type AngularSchema = typeof schema;

export type AngularSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

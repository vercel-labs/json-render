import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/uniapp
 *
 * Defines:
 * - Spec: A flat tree of elements with keys, types, props, and children references
 * - Catalog: Components with props schemas, and optional actions
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
      {
        name: "validateForm",
        description:
          "Validate all registered form fields and write the result to state. Params: { statePath?: string }. Defaults to /formValidation. Result: { valid: boolean, errors: Record<string, string[]> }.",
      },
      {
        name: "navigateTo",
        description:
          "Navigate to a UniApp page. Params: { url: string }. The url should be a page path like '/pages/detail/index?id=1'.",
      },
      {
        name: "navigateBack",
        description:
          "Go back to the previous UniApp page. Params: { delta?: number }. delta defaults to 1.",
      },
      {
        name: "redirectTo",
        description:
          "Redirect to a UniApp page, replacing the current page in the stack. Params: { url: string }.",
      },
      {
        name: "switchTab",
        description:
          "Switch to a tab page in the UniApp tab bar. Params: { url: string }.",
      },
    ],
    defaultRules: [
      // Element integrity
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
      "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",

      // Field placement
      'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"<ComponentName>","props":{},"visible":{"$state":"/tab","eq":"home"},"children":[...]}.',
      'CRITICAL: The "on" field goes on the ELEMENT object, NOT inside "props". Use on.tap, on.change, on.submit etc. NEVER put action/actionParams inside props.',

      // UniApp-specific component guidance
      "IMPORTANT: This is a UniApp application. Use UniApp built-in components: view (container), text (text content), button (tap button), image (image display), input (text input), scroll-view (scrollable container), swiper (carousel), navigator (page link), icon, progress, rich-text, etc. ONLY use components from the AVAILABLE COMPONENTS list.",
      "IMPORTANT: UniApp uses rpx (responsive pixel) units for sizes. 750rpx = full screen width. Use rpx for consistent cross-platform sizing.",
      "IMPORTANT: UniApp uses @tap instead of @click for touch events. Map 'press' events to on.tap. Map 'change' events to on.change.",

      // State and data
      "When the user asks for a UI that displays data (e.g. blog posts, products, users), ALWAYS include a state field with realistic sample data. The state field is a top-level field on the spec (sibling of root/elements).",
      'When building repeating content backed by a state array (e.g. posts, products, items), use the "repeat" field on a container element. Example: { "type": "<ContainerComponent>", "props": {}, "repeat": { "statePath": "/posts", "key": "id" }, "children": ["post-card"] }. Replace <ContainerComponent> with an appropriate component from the AVAILABLE COMPONENTS list. Inside repeated children, use { "$item": "field" } to read a field from the current item, and { "$index": true } for the current array index. For two-way binding to an item field use { "$bindItem": "completed" }. Do NOT hardcode individual elements for each array item.',

      // Design quality
      "Design with visual hierarchy: use container components (view) to group content, text components with font-weight for section titles, proper spacing using padding/margin, and status indicators. ONLY use components from the AVAILABLE COMPONENTS list.",
      "For data-rich UIs, use scroll-view for scrollable lists. For forms and single-column content, use view with flex layout. ONLY use components from the AVAILABLE COMPONENTS list.",
      "Always include realistic, professional-looking sample data. For blogs include 3-4 posts with varied titles, authors, dates, categories. For products include names, prices, images. Never leave data empty.",
      "Use UniApp-compatible styles: flex layout (display:flex), box model (padding, margin, border), background-color, color, font-size (in rpx), border-radius. Avoid CSS features that are not supported in mini programs.",
    ],
  },
);

/**
 * Type for the UniApp schema
 */
export type UniAppSchema = typeof schema;

/**
 * Infer the spec type from a catalog
 */
export type UniAppSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

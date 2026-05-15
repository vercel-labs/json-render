import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/react-native
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
          visible: { ...s.any(), ...s.optional() },
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
    defaultRules: [
      // Layout patterns
      "FIXED BOTTOM BAR PATTERN: When building a screen with a fixed header and/or fixed bottom tab bar, the outermost vertical layout component must have flex:1 so it fills the screen. The scrollable content area must also have flex:1. Structure: screen wrapper > vertical layout(flex:1, gap:0) > [header, content wrapper(flex:1) > [scroll container(...)], bottom-tabs]. Both the outer layout AND the content wrapper need flex:1. ONLY use components from the AVAILABLE COMPONENTS list.",
      "NEVER place a bottom tab bar or fixed footer inside a scroll container. It must be a sibling AFTER the flex:1 container that holds the scroll content.",

      // Element integrity
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
      "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",
      'When building repeating content backed by a state array (e.g. todos, posts, cart items), use the "repeat" field on a container element from the AVAILABLE COMPONENTS list. Example: { "type": "<ContainerComponent>", "props": { "gap": 8 }, "repeat": { "statePath": "/todos", "key": "id" }, "children": ["todo-item"] }. Inside repeated children, use { "$item": "field" } to read a field from the current item, and { "$index": true } for the current array index. For two-way binding to an item field use { "$bindItem": "completed" }. Do NOT hardcode individual elements for each array item.',

      // Visible field placement
      'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"<ComponentName>","props":{},"visible":{"$state":"/activeTab","eq":"home"},"children":[...]}. WRONG: {"type":"<ComponentName>","props":{},"visible":{...},"children":[...]} with visible inside props.',

      // Tab navigation pattern
      "TAB NAVIGATION PATTERN: When building a UI with multiple tabs, use a pressable/tappable component + setState action + visible conditions to make tabs functional. ONLY use components from the AVAILABLE COMPONENTS list.",
      'Each tab button should be a pressable component wrapping its icon/label children, with action "setState" and actionParams { "statePath": "/activeTab", "value": "tabName" }.',
      'Each tab\'s content section should have a visible condition: { "$state": "/activeTab", "eq": "tabName" }.',
      "The first tab's content should NOT have a visible condition (so it shows by default when no tab is selected yet). All other tabs MUST have a visible condition.",

      // Tab active state highlighting (using dynamic props)
      "TAB ACTIVE STYLING: Use $cond dynamic props on icon elements inside each tab button so a single icon changes appearance based on the active tab.",
      '  - For the icon name: { "$cond": { "$state": "/activeTab", "eq": "thisTabName" }, "$then": "home", "$else": "home-outline" }',
      '  - For the icon color: { "$cond": { "$state": "/activeTab", "eq": "thisTabName" }, "$then": "#007AFF", "$else": "#8E8E93" }',
      "  - For labels, use $cond on the color prop similarly.",
      '  - For the FIRST/DEFAULT tab, use { "$cond": [{ "$state": "/activeTab", "eq": "thisTabName" }], "$then": "#007AFF", "$else": "#8E8E93" } so it appears active before any tab is tapped. When no tab is selected yet, include a default tab with no visible condition.',

      // Push/pop screen navigation (all screens in one spec)
      'SCREEN NAVIGATION: Use a pressable component with action "push" and actionParams { "screen": "screenName" } to navigate to a new screen. Use action "pop" to go back. All screens must be defined in the SAME spec. ONLY use components from the AVAILABLE COMPONENTS list.',
      'Each screen section uses a visible condition on /currentScreen: { "$state": "/currentScreen", "eq": "screenName" }. The default/home screen should show by default (no visible condition) and all other screens should have the appropriate visible condition.',
      "push automatically maintains a /navStack in the state model so pop always returns to the previous screen.",
      'Include a back button on pushed screens using action "pop". Example: pressable(action:"pop") > row layout > back icon + back label. ONLY use components from the AVAILABLE COMPONENTS list.',
      "Use push/pop for drill-down flows: tapping a list item to see details, opening a profile, etc. Use setState + visible conditions for tab switching within a screen.",
      'Example: A list screen with items that push to detail: a pressable component with action:"push" and actionParams:{screen:"detail"} wrapping each list item. The detail screen section has visible:{"$state":"/currentScreen","eq":"detail"} and contains a back button with action:"pop". ONLY use components from the AVAILABLE COMPONENTS list.',
    ],
  },
);

/**
 * Type for the React Native schema
 */
export type ReactNativeSchema = typeof schema;

/**
 * Infer the spec type from a catalog
 */
export type ReactNativeSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

// Backward compatibility aliases
/** @deprecated Use `schema` instead */
export const elementTreeSchema = schema;
/** @deprecated Use `ReactNativeSchema` instead */
export type ElementTreeSchema = ReactNativeSchema;
/** @deprecated Use `ReactNativeSpec` instead */
export type ElementTreeSpec<T> = ReactNativeSpec<T>;

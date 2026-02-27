import type { Spec } from "@json-render/core";

export const demoSpec: Spec = {
  root: "root",
  state: {
    renderer: "vue",
    count: 0,
    todos: [
      { id: 1, title: "Learn JSON Render", completed: true },
      {
        id: 2,
        title: "Try @json-render/vue or @json-render/react",
        completed: false,
      },
      { id: 3, title: "Build something awesome", completed: false },
    ],
  },
  elements: {
    root: {
      type: "Stack",
      props: { gap: 24, padding: 24, direction: "vertical" },
      children: [
        "demo-title",
        "renderer-tabs",
        "renderer-badge",
        "counter-card",
        "milestone-badge",
        "todos-card",
      ],
    },

    "demo-title": {
      type: "Text",
      props: {
        content: "@json-render multi-renderer demo",
        size: "xl",
        weight: "bold",
      },
    },
    "renderer-badge": {
      type: "RendererBadge",
      props: { renderer: { $state: "/renderer" } },
    },
    "renderer-tabs": {
      type: "RendererTabs",
      props: { renderer: { $state: "/renderer" } },
      on: {
        pressVue: { action: "switchToVue" },
        pressReact: { action: "switchToReact" },
      },
    },

    // ---- Counter card ----
    "counter-card": {
      type: "Card",
      props: {
        title: "Counter",
        subtitle: "Click the buttons to change the count",
      },
      children: ["counter-body"],
    },
    "counter-body": {
      type: "Stack",
      props: { gap: 12, direction: "horizontal", align: "center" },
      children: [
        "decrement-btn",
        "counter-value",
        "increment-btn",
        "reset-btn",
      ],
    },
    "decrement-btn": {
      type: "Button",
      props: { label: "−", variant: "secondary" },
      on: { press: { action: "decrement" } },
    },
    "counter-value": {
      type: "Text",
      props: {
        content: { $state: "/count" },
        size: "xl",
        weight: "bold",
      },
    },
    "increment-btn": {
      type: "Button",
      props: { label: "+", variant: "primary" },
      on: { press: { action: "increment" } },
    },
    "reset-btn": {
      type: "Button",
      props: { label: "Reset", variant: "danger" },
      on: { press: { action: "reset" } },
    },

    // ---- Milestone badge (visible only when count >= 10) ----
    "milestone-badge": {
      type: "Badge",
      props: { label: "Milestone reached: 10!", color: "#10b981" },
      visible: { $state: "/count", gte: 10 },
    },

    // ---- Todos card ----
    "todos-card": {
      type: "Card",
      props: { title: "Todo List", subtitle: "Your tasks" },
      children: ["todos-list"],
    },
    "todos-list": {
      type: "Stack",
      props: { gap: 8, direction: "vertical" },
      repeat: { statePath: "/todos", key: "id" },
      children: ["todo-item"],
    },
    "todo-item": {
      type: "ListItem",
      props: {
        title: { $item: "title" },
        completed: { $item: "completed" },
      },
      on: {
        press: { action: "toggleItem", params: { index: { $index: true } } },
      },
    },
  },
};

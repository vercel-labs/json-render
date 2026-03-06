import type { Spec } from "@json-render/core";

export const demoSpec: Spec = {
  root: "root",
  state: {
    count: 0,
    name: "",
    todos: [
      { id: 1, title: "Learn Svelte 5", completed: true },
      { id: 2, title: "Try @json-render/svelte", completed: false },
      { id: 3, title: "Build something awesome", completed: false },
    ],
  },
  elements: {
    root: {
      type: "Stack",
      props: { gap: 24, padding: 24, direction: "vertical" },
      children: [
        "header",
        "counter-card",
        "milestone-badge",
        "todos-card",
        "input-card",
      ],
    },
    header: {
      type: "Text",
      props: {
        content: "@json-render/svelte demo",
        size: "xl",
        weight: "bold",
      },
    },
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
    "milestone-badge": {
      type: "Badge",
      props: { label: "Milestone reached: 10!", color: "#10b981" },
      visible: { $state: "/count", gte: 10 },
    },
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
    "input-card": {
      type: "Card",
      props: {
        title: "Bound Input",
        subtitle: "Type to update state and see reactive text",
      },
      children: ["input-body"],
    },
    "input-body": {
      type: "Stack",
      props: { gap: 12, direction: "vertical" },
      children: ["name-input", "name-display"],
    },
    "name-input": {
      type: "Input",
      props: {
        value: { $bindState: "/name" },
        placeholder: "Enter your name…",
      },
    },
    "name-display": {
      type: "Text",
      props: {
        content: { $state: "/name" },
        size: "md",
        color: "#6b7280",
      },
    },
  },
};

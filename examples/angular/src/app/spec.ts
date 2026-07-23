import type { Spec } from "@json-render/core";

/**
 * Demo spec exercising every spec-driven feature of @json-render/angular.
 *
 * Each section maps to a feature in the checklist:
 * 1. Basic rendering (root + children tree)
 * 2. $state read binding
 * 3. $bindState two-way binding
 * 4. $template interpolation
 * 5. $cond dynamic props
 * 6. repeat with $item / $index
 * 7. Filtered lists ($item visibility)
 * 8. visible conditions ($state)
 * 9. Built-in actions (setState, pushState, removeState, validateForm)
 * 10. Custom actions (increment, decrement, toggleItem)
 * 11. Confirmation dialog (deleteConfirmed)
 * 12. Validation (required field + validateForm)
 * 13. State watchers
 */
export const demoSpec: Spec = {
  root: "root",
  state: {
    count: 0,
    name: "",
    tab: "all",
    newTodo: "",
    todos: [
      { id: "1", title: "Learn Angular signals", status: "done" },
      { id: "2", title: "Try @json-render/angular", status: "todo" },
      { id: "3", title: "Build something awesome", status: "todo" },
    ],
  },
  elements: {
    root: {
      type: "Stack",
      props: { gap: 20, direction: "vertical" },
      children: [
        "counter-card",
        "input-card",
        "todo-card",
        "validation-card",
        "confirm-card",
        "watcher-card",
      ],
    },

    // -- Counter: $state, custom actions, visibility, $cond ---------------
    "counter-card": {
      type: "Card",
      props: {
        title: "Counter",
        subtitle: "Features: $state, custom actions, visible condition, $cond",
      },
      children: ["counter-body", "milestone-badge"],
    },
    "counter-body": {
      type: "Stack",
      props: { gap: 12, direction: "horizontal", align: "center" },
      children: ["dec-btn", "counter-value", "inc-btn", "reset-btn"],
    },
    "dec-btn": {
      type: "Button",
      props: { label: "-", variant: "secondary" },
      on: { press: { action: "decrement" } },
    },
    "counter-value": {
      type: "Text",
      props: {
        content: { $state: "/count" },
        size: "xl",
        weight: "bold",
        color: {
          $cond: { $state: "/count", gte: 10 },
          $then: "#16a34a",
          $else: "#111827",
        },
      },
    },
    "inc-btn": {
      type: "Button",
      props: { label: "+", variant: "primary" },
      on: { press: { action: "increment" } },
    },
    "reset-btn": {
      type: "Button",
      props: { label: "Reset", variant: "danger" },
      on: {
        press: {
          action: "setState",
          params: { statePath: "/count", value: 0 },
        },
      },
    },
    "milestone-badge": {
      type: "Badge",
      props: { label: "Milestone reached: 10!", color: "#16a34a" },
      visible: { $state: "/count", gte: 10 },
    },

    // -- Bound Input: $bindState, $template -------------------------------
    "input-card": {
      type: "Card",
      props: {
        title: "Two-Way Binding",
        subtitle: "Features: $bindState, $template, injectBoundProp",
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
        placeholder: "Type your name...",
      },
    },
    "name-display": {
      type: "Text",
      props: {
        content: { $template: "Hello, ${/name}!" },
        size: "md",
        color: "#6b7280",
      },
    },

    // -- Todo List: repeat, $item, $index, filtered lists, pushState, removeState
    "todo-card": {
      type: "Card",
      props: {
        title: "Todo List",
        subtitle:
          "Features: repeat, $item, $index, filtered lists, pushState, removeState, toggleItem",
      },
      children: [
        "todo-tabs",
        "add-todo-row",
        "todo-list-all",
        "todo-list-todo",
        "todo-list-done",
      ],
    },
    "todo-tabs": {
      type: "Stack",
      props: { gap: 8, direction: "horizontal" },
      children: ["tab-all", "tab-todo", "tab-done"],
    },
    "tab-all": {
      type: "Button",
      props: {
        label: "All",
        variant: {
          $cond: { $state: "/tab", eq: "all" },
          $then: "primary",
          $else: "secondary",
        },
      },
      on: {
        press: {
          action: "setState",
          params: { statePath: "/tab", value: "all" },
        },
      },
    },
    "tab-todo": {
      type: "Button",
      props: {
        label: "Todo",
        variant: {
          $cond: { $state: "/tab", eq: "todo" },
          $then: "primary",
          $else: "secondary",
        },
      },
      on: {
        press: {
          action: "setState",
          params: { statePath: "/tab", value: "todo" },
        },
      },
    },
    "tab-done": {
      type: "Button",
      props: {
        label: "Done",
        variant: {
          $cond: { $state: "/tab", eq: "done" },
          $then: "primary",
          $else: "secondary",
        },
      },
      on: {
        press: {
          action: "setState",
          params: { statePath: "/tab", value: "done" },
        },
      },
    },
    "add-todo-row": {
      type: "Stack",
      props: { gap: 8, direction: "horizontal", align: "center" },
      children: ["new-todo-input", "add-todo-btn"],
    },
    "new-todo-input": {
      type: "Input",
      props: {
        value: { $bindState: "/newTodo" },
        placeholder: "Add a todo...",
      },
    },
    "add-todo-btn": {
      type: "Button",
      props: { label: "Add", variant: "primary" },
      on: {
        press: {
          action: "pushState",
          params: {
            statePath: "/todos",
            value: {
              id: { $id: true },
              title: { $state: "/newTodo" },
              status: "todo",
            },
            clearStatePath: "/newTodo",
          },
        },
      },
    },

    // All items
    "todo-list-all": {
      type: "Stack",
      props: { gap: 8, direction: "vertical" },
      visible: { $state: "/tab", eq: "all" },
      repeat: { statePath: "/todos", key: "id" },
      children: ["todo-item"],
    },
    // Filtered: todo only
    "todo-list-todo": {
      type: "Stack",
      props: { gap: 8, direction: "vertical" },
      visible: {
        $and: [
          { $state: "/tab", eq: "todo" },
          { $item: "status", eq: "todo" },
        ],
      },
      repeat: { statePath: "/todos", key: "id" },
      children: ["todo-item"],
    },
    // Filtered: done only
    "todo-list-done": {
      type: "Stack",
      props: { gap: 8, direction: "vertical" },
      visible: {
        $and: [
          { $state: "/tab", eq: "done" },
          { $item: "status", eq: "done" },
        ],
      },
      repeat: { statePath: "/todos", key: "id" },
      children: ["todo-item"],
    },
    "todo-item": {
      type: "ListItem",
      props: {
        title: { $item: "title" },
        completed: {
          $cond: { $item: "status", eq: "done" },
          $then: true,
          $else: false,
        },
      },
      on: {
        press: {
          action: "toggleItem",
          params: { index: { $index: true } },
        },
      },
    },

    // -- Validation: required field + validateForm action -----------------
    "validation-card": {
      type: "Card",
      props: {
        title: "Form Validation",
        subtitle:
          "Features: validation checks, validateForm action, validation result in state",
      },
      children: ["validation-body"],
    },
    "validation-body": {
      type: "Stack",
      props: { gap: 12, direction: "vertical" },
      children: ["email-input", "validate-btn", "validation-result"],
    },
    "email-input": {
      type: "Input",
      props: {
        value: { $bindState: "/email" },
        placeholder: "Enter email (required field)...",
        checks: [{ type: "required", message: "Email is required" }],
        validateOn: "blur",
      },
    },
    "validate-btn": {
      type: "Button",
      props: { label: "Validate Form", variant: "primary" },
      on: { press: { action: "validateForm" } },
    },
    "validation-result": {
      type: "Text",
      props: {
        content: { $template: "Result: valid=${/formValidation/valid}" },
        size: "sm",
        color: "#6b7280",
      },
      visible: { $state: "/formValidation" },
    },

    // -- Confirmation dialog ----------------------------------------------
    "confirm-card": {
      type: "Card",
      props: {
        title: "Confirmation Dialog",
        subtitle: "Features: action confirm clause, ConfirmDialog component",
      },
      children: ["confirm-body"],
    },
    "confirm-body": {
      type: "Stack",
      props: { gap: 12, direction: "vertical" },
      children: ["confirm-btn", "confirm-status"],
    },
    "confirm-btn": {
      type: "Button",
      props: {
        label: "Delete All Todos (requires confirmation)",
        variant: "danger",
      },
      on: {
        press: {
          action: "deleteConfirmed",
          confirm: {
            title: "Delete All Todos?",
            message:
              "This will remove every item from the list. This cannot be undone.",
            confirmLabel: "Delete",
            cancelLabel: "Keep",
            variant: "danger",
          },
        },
      },
    },
    "confirm-status": {
      type: "Text",
      props: {
        content: { $state: "/deleteStatus" },
        size: "sm",
        color: "#dc2626",
      },
      visible: { $state: "/deleteStatus" },
    },

    // -- State Watcher ----------------------------------------------------
    "watcher-card": {
      type: "Card",
      props: {
        title: "State Watcher",
        subtitle:
          "Features: watch field -- copies /count to /watchLog on every change",
      },
      children: ["watch-display"],
    },
    "watch-display": {
      type: "Text",
      props: {
        content: { $template: "Last watched count value: ${/watchLog}" },
        size: "sm",
        color: "#6b7280",
      },
      watch: {
        "/count": {
          action: "setState",
          params: { statePath: "/watchLog", value: { $state: "/count" } },
        },
      },
    },
  },
};

/**
 * Comprehensive demo/mockup file for testing the JSON renderer
 * This file demonstrates various use cases of the SolidJS JSON renderer
 */

import { createRoot, type JSX, createSignal } from "solid-js";
import type { UITree, UIElement } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRegistry,
  type ComponentRenderProps,
  useData,
  useDataBinding,
  useIsVisible,
  useActions,
  flatToTree,
} from "../index";

// ============================================================================
// COMPONENT REGISTRY - Define renderers for each element type
// ============================================================================

// Text component
function TextRenderer(
  props: ComponentRenderProps<{ content: string; variant?: string }>,
) {
  const variants: Record<string, string> = {
    heading: "font-size: 24px; font-weight: bold;",
    subheading: "font-size: 18px; font-weight: 600;",
    body: "font-size: 14px;",
    caption: "font-size: 12px; color: #666;",
  };
  const style =
    variants[props.element.props.variant ?? "body"] ?? variants.body;
  return <p style={style}>{props.element.props.content}</p>;
}

// Button component with action support
function ButtonRenderer(
  props: ComponentRenderProps<{
    label: string;
    variant?: "primary" | "secondary" | "danger";
    action?: { name: string; params?: Record<string, unknown> };
  }>,
) {
  const variantStyles: Record<string, string> = {
    primary: "background: #3b82f6; color: white; border: none;",
    secondary: "background: white; color: #333; border: 1px solid #ccc;",
    danger: "background: #dc2626; color: white; border: none;",
  };
  const style =
    (variantStyles[props.element.props.variant ?? "primary"] ??
      variantStyles.primary) +
    " padding: 8px 16px; border-radius: 6px; cursor: pointer;";

  const handleClick = () => {
    if (props.element.props.action && props.onAction) {
      props.onAction(props.element.props.action);
    }
  };

  return (
    <button style={style} onClick={handleClick} disabled={props.loading}>
      {props.loading ? "Loading..." : props.element.props.label}
    </button>
  );
}

// Stack component (vertical layout)
function StackRenderer(
  props: ComponentRenderProps<{
    gap?: number;
    direction?: "vertical" | "horizontal";
  }>,
) {
  const gap = props.element.props.gap ?? 8;
  const direction = props.element.props.direction ?? "vertical";
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": direction === "vertical" ? "column" : "row",
        gap: `${gap}px`,
      }}
    >
      {props.children}
    </div>
  );
}

// Card component
function CardRenderer(
  props: ComponentRenderProps<{ title?: string; padding?: number }>,
) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        "border-radius": "8px",
        padding: `${props.element.props.padding ?? 16}px`,
        "background-color": "white",
        "box-shadow": "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      {props.element.props.title && (
        <h3
          style={{
            margin: "0 0 12px 0",
            "font-size": "16px",
            "font-weight": "600",
          }}
        >
          {props.element.props.title}
        </h3>
      )}
      {props.children}
    </div>
  );
}

// Input component with data binding
function InputRenderer(
  props: ComponentRenderProps<{
    label: string;
    path: string;
    placeholder?: string;
    type?: string;
  }>,
) {
  const [value, setValue] = useDataBinding<string>(props.element.props.path);

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
      <label style={{ "font-size": "14px", "font-weight": "500" }}>
        {props.element.props.label}
      </label>
      <input
        type={props.element.props.type ?? "text"}
        placeholder={props.element.props.placeholder}
        value={value() ?? ""}
        onInput={(e) => setValue(e.currentTarget.value)}
        style={{
          padding: "8px 12px",
          border: "1px solid #d1d5db",
          "border-radius": "6px",
          "font-size": "14px",
        }}
      />
    </div>
  );
}

// Badge component
function BadgeRenderer(
  props: ComponentRenderProps<{ text: string; color?: string }>,
) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        "background-color": props.element.props.color ?? "#e5e7eb",
        "border-radius": "12px",
        "font-size": "12px",
        "font-weight": "500",
      }}
    >
      {props.element.props.text}
    </span>
  );
}

// Alert component
function AlertRenderer(
  props: ComponentRenderProps<{
    message: string;
    variant?: "info" | "success" | "warning" | "error";
  }>,
) {
  const defaultStyles = { bg: "#eff6ff", border: "#3b82f6", color: "#1e40af" };
  const variantStyles: Record<
    string,
    { bg: string; border: string; color: string }
  > = {
    info: defaultStyles,
    success: { bg: "#f0fdf4", border: "#22c55e", color: "#166534" },
    warning: { bg: "#fffbeb", border: "#f59e0b", color: "#92400e" },
    error: { bg: "#fef2f2", border: "#ef4444", color: "#991b1b" },
  };
  const styles =
    variantStyles[props.element.props.variant ?? "info"] ?? defaultStyles;

  return (
    <div
      style={{
        padding: "12px 16px",
        "background-color": styles.bg,
        "border-left": `4px solid ${styles.border}`,
        color: styles.color,
        "border-radius": "0 6px 6px 0",
      }}
    >
      {props.element.props.message}
    </div>
  );
}

// Divider component
function DividerRenderer() {
  return (
    <hr
      style={{
        border: "none",
        "border-top": "1px solid #e5e7eb",
        margin: "16px 0",
      }}
    />
  );
}

// Component registry
const registry: ComponentRegistry = {
  text: TextRenderer,
  button: ButtonRenderer,
  stack: StackRenderer,
  card: CardRenderer,
  input: InputRenderer,
  badge: BadgeRenderer,
  alert: AlertRenderer,
  divider: DividerRenderer,
};

// ============================================================================
// MOCKUP 1: Basic UI Tree
// ============================================================================

export const basicTree: UITree = {
  root: "root",
  elements: {
    root: {
      key: "root",
      type: "stack",
      props: { gap: 16 },
      children: ["heading", "description", "button"],
    },
    heading: {
      key: "heading",
      type: "text",
      props: { content: "Welcome to JSON Render", variant: "heading" },
    },
    description: {
      key: "description",
      type: "text",
      props: {
        content:
          "This is a SolidJS-based JSON renderer for building UIs dynamically.",
      },
    },
    button: {
      key: "button",
      type: "button",
      props: { label: "Get Started", variant: "primary" },
    },
  },
};

// ============================================================================
// MOCKUP 2: Nested Cards with Data Binding
// ============================================================================

export const formTree: UITree = {
  root: "root",
  elements: {
    root: {
      key: "root",
      type: "stack",
      props: { gap: 16 },
      children: ["card1", "card2"],
    },
    card1: {
      key: "card1",
      type: "card",
      props: { title: "Personal Information" },
      children: ["nameInput", "emailInput"],
    },
    nameInput: {
      key: "nameInput",
      type: "input",
      props: {
        label: "Name",
        path: "/user/name",
        placeholder: "Enter your name",
      },
    },
    emailInput: {
      key: "emailInput",
      type: "input",
      props: {
        label: "Email",
        path: "/user/email",
        placeholder: "Enter your email",
        type: "email",
      },
    },
    card2: {
      key: "card2",
      type: "card",
      props: { title: "Actions" },
      children: ["submitBtn", "cancelBtn"],
    },
    submitBtn: {
      key: "submitBtn",
      type: "button",
      props: {
        label: "Submit",
        variant: "primary",
        action: { name: "submit" },
      },
    },
    cancelBtn: {
      key: "cancelBtn",
      type: "button",
      props: {
        label: "Cancel",
        variant: "secondary",
        action: { name: "cancel" },
      },
    },
  },
};

// ============================================================================
// MOCKUP 3: Visibility Conditions
// ============================================================================

export const visibilityTree: UITree = {
  root: "root",
  elements: {
    root: {
      key: "root",
      type: "stack",
      props: { gap: 16 },
      children: ["toggle", "conditionalCard"],
    },
    toggle: {
      key: "toggle",
      type: "button",
      props: {
        label: "Toggle Card",
        variant: "secondary",
        action: { name: "toggleCard" },
      },
    },
    conditionalCard: {
      key: "conditionalCard",
      type: "card",
      props: { title: "Conditional Content" },
      visible: { path: "/showCard" },
      children: ["conditionalText"],
    },
    conditionalText: {
      key: "conditionalText",
      type: "text",
      props: { content: "This card is only visible when showCard is true!" },
    },
  },
};

// ============================================================================
// MOCKUP 4: Dashboard Layout
// ============================================================================

export const dashboardTree: UITree = {
  root: "root",
  elements: {
    root: {
      key: "root",
      type: "stack",
      props: { gap: 24 },
      children: ["header", "alerts", "stats", "content"],
    },
    header: {
      key: "header",
      type: "stack",
      props: { direction: "horizontal", gap: 12 },
      children: ["title", "badge"],
    },
    title: {
      key: "title",
      type: "text",
      props: { content: "Dashboard", variant: "heading" },
    },
    badge: {
      key: "badge",
      type: "badge",
      props: { text: "Live", color: "#dcfce7" },
    },
    alerts: {
      key: "alerts",
      type: "stack",
      props: { gap: 8 },
      children: ["successAlert", "warningAlert"],
    },
    successAlert: {
      key: "successAlert",
      type: "alert",
      props: { message: "All systems operational", variant: "success" },
    },
    warningAlert: {
      key: "warningAlert",
      type: "alert",
      props: {
        message: "Scheduled maintenance in 2 hours",
        variant: "warning",
      },
    },
    stats: {
      key: "stats",
      type: "stack",
      props: { direction: "horizontal", gap: 16 },
      children: ["stat1", "stat2", "stat3"],
    },
    stat1: {
      key: "stat1",
      type: "card",
      props: { title: "Users", padding: 12 },
      children: ["stat1Value"],
    },
    stat1Value: {
      key: "stat1Value",
      type: "text",
      props: { content: "1,234", variant: "heading" },
    },
    stat2: {
      key: "stat2",
      type: "card",
      props: { title: "Revenue", padding: 12 },
      children: ["stat2Value"],
    },
    stat2Value: {
      key: "stat2Value",
      type: "text",
      props: { content: "$45,678", variant: "heading" },
    },
    stat3: {
      key: "stat3",
      type: "card",
      props: { title: "Orders", padding: 12 },
      children: ["stat3Value"],
    },
    stat3Value: {
      key: "stat3Value",
      type: "text",
      props: { content: "890", variant: "heading" },
    },
    content: {
      key: "content",
      type: "card",
      props: { title: "Recent Activity" },
      children: ["activity1", "divider1", "activity2", "divider2", "activity3"],
    },
    activity1: {
      key: "activity1",
      type: "text",
      props: { content: "User john@example.com signed up", variant: "body" },
    },
    divider1: { key: "divider1", type: "divider", props: {} },
    activity2: {
      key: "activity2",
      type: "text",
      props: { content: "Order #1234 was completed", variant: "body" },
    },
    divider2: { key: "divider2", type: "divider", props: {} },
    activity3: {
      key: "activity3",
      type: "text",
      props: { content: "Payment of $99.99 received", variant: "body" },
    },
  },
};

// ============================================================================
// MOCKUP 5: Using flatToTree utility
// ============================================================================

export const flatElements = [
  { key: "root", type: "stack", props: { gap: 16 }, parentKey: null },
  {
    key: "title",
    type: "text",
    props: { content: "Built from flat array", variant: "heading" },
    parentKey: "root",
  },
  {
    key: "card",
    type: "card",
    props: { title: "Nested Card" },
    parentKey: "root",
  },
  {
    key: "cardText",
    type: "text",
    props: { content: "This tree was built using flatToTree()" },
    parentKey: "card",
  },
  {
    key: "cardButton",
    type: "button",
    props: { label: "Click Me", variant: "primary", action: { name: "click" } },
    parentKey: "card",
  },
];

export const flatToTreeDemo = flatToTree(flatElements);

// ============================================================================
// DEMO RUNNER - Test function
// ============================================================================

export function runDemos() {
  console.log("=== JSON Render SolidJS Demo ===\n");

  // Test 1: Basic Tree
  console.log("1. Basic Tree:");
  console.log(JSON.stringify(basicTree, null, 2));
  console.log("");

  // Test 2: Form Tree
  console.log("2. Form Tree with Data Binding:");
  console.log(`   - Has ${Object.keys(formTree.elements).length} elements`);
  console.log(`   - Root: ${formTree.root}`);
  console.log("");

  // Test 3: Visibility Tree
  console.log("3. Visibility Conditions Tree:");
  const conditionalElement = visibilityTree.elements["conditionalCard"];
  console.log(
    `   - Conditional card visibility: ${JSON.stringify(conditionalElement?.visible)}`,
  );
  console.log("");

  // Test 4: Dashboard Tree
  console.log("4. Dashboard Layout:");
  console.log(
    `   - Has ${Object.keys(dashboardTree.elements).length} elements`,
  );
  console.log("");

  // Test 5: flatToTree
  console.log("5. flatToTree utility:");
  console.log(`   - Input: ${flatElements.length} flat elements`);
  console.log(`   - Output root: ${flatToTreeDemo.root}`);
  console.log(
    `   - Output elements: ${Object.keys(flatToTreeDemo.elements).length}`,
  );
  console.log("");

  console.log("=== All demos completed ===");
}

// Run demos if this file is executed directly
if (typeof window === "undefined") {
  runDemos();
}

// ============================================================================
// DEMO APP - Full SolidJS App Example
// ============================================================================

export function DemoApp(): JSX.Element {
  const [currentTree, setCurrentTree] = createSignal<UITree>(basicTree);
  const [treeName, setTreeName] = createSignal("Basic");

  const trees: Record<string, UITree> = {
    Basic: basicTree,
    Form: formTree,
    Visibility: visibilityTree,
    Dashboard: dashboardTree,
    FlatToTree: flatToTreeDemo,
  };

  const actionHandlers: Record<
    string,
    (params: Record<string, unknown>) => unknown
  > = {
    submit: async (params) => {
      console.log("Submit action triggered with params:", params);
      alert("Form submitted!");
    },
    cancel: () => {
      console.log("Cancel action triggered");
    },
    toggleCard: () => {
      // Note: In a real app, this would use setData from the action context
      // For demo purposes, we just log
      console.log("Toggle card action triggered");
    },
    click: () => {
      console.log("Button clicked!");
    },
  };

  return (
    <div
      style={{
        "font-family": "system-ui, sans-serif",
        padding: "24px",
        "max-width": "800px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ "margin-bottom": "24px" }}>JSON Render SolidJS Demo</h1>

      <div
        style={{
          "margin-bottom": "24px",
          display: "flex",
          gap: "8px",
          "flex-wrap": "wrap",
        }}
      >
        {Object.keys(trees).map((name) => (
          <button
            style={{
              padding: "8px 16px",
              "border-radius": "6px",
              border:
                treeName() === name ? "2px solid #3b82f6" : "1px solid #ccc",
              background: treeName() === name ? "#eff6ff" : "white",
              cursor: "pointer",
            }}
            onClick={() => {
              const tree = trees[name];
              if (tree) {
                setTreeName(name);
                setCurrentTree(tree);
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          "border-radius": "8px",
          padding: "24px",
          "background-color": "#f9fafb",
        }}
      >
        <JSONUIProvider
          registry={registry}
          initialData={{ user: { name: "", email: "" }, showCard: true }}
          actionHandlers={actionHandlers}
        >
          <Renderer tree={currentTree()} registry={registry} />
        </JSONUIProvider>
      </div>

      <div
        style={{
          "margin-top": "24px",
          padding: "16px",
          background: "#f3f4f6",
          "border-radius": "6px",
        }}
      >
        <h3 style={{ margin: "0 0 8px 0" }}>Current Tree JSON:</h3>
        <pre
          style={{
            margin: 0,
            "font-size": "12px",
            overflow: "auto",
            "max-height": "300px",
          }}
        >
          {JSON.stringify(currentTree(), null, 2)}
        </pre>
      </div>
    </div>
  );
}

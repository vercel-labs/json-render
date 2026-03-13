/**
 * Interactive React island using @json-render/react.
 *
 * This component is hydrated client-side via Astro's `client:visible` directive.
 * It demonstrates that @json-render/astro (static SSR) and @json-render/react
 * (interactive islands) can coexist on the same page.
 */
import { useState, useRef, useMemo } from "react";
import {
  StateProvider,
  ActionProvider,
  VisibilityProvider,
  Renderer,
  defineRegistry,
} from "@json-render/react";
import { schema } from "@json-render/react/schema";
import { defineCatalog } from "@json-render/core";
import type { Spec } from "@json-render/core";
import { z } from "zod";

// --- Catalog (what components/actions are available) ---

const catalog = defineCatalog(schema, {
  components: {
    Stack: {
      props: z.object({
        gap: z.number().optional(),
        direction: z.enum(["vertical", "horizontal"]).optional(),
        align: z.enum(["start", "center", "end"]).optional(),
      }),
      description: "Layout container",
    },
    Text: {
      props: z.object({
        content: z.string(),
        size: z.enum(["sm", "md", "lg", "xl"]).optional(),
        weight: z.enum(["normal", "bold"]).optional(),
      }),
      description: "Text display",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).optional(),
      }),
      description: "Clickable button",
    },
  },
  actions: {
    increment: { description: "Increment counter" },
    decrement: { description: "Decrement counter" },
    reset: { description: "Reset counter to 0" },
  },
});

// --- Registry (how components render + action handlers) ---

const { registry, handlers: createHandlers } = defineRegistry(catalog, {
  components: {
    Stack: ({ props, children }) => (
      <div
        style={{
          display: "flex",
          flexDirection: props.direction === "horizontal" ? "row" : "column",
          gap: props.gap ? `${props.gap}px` : undefined,
          alignItems:
            props.align ??
            (props.direction === "horizontal" ? "center" : "stretch"),
        }}
      >
        {children}
      </div>
    ),
    Text: ({ props }) => (
      <span
        style={{
          fontSize:
            props.size === "xl"
              ? "24px"
              : props.size === "lg"
                ? "16px"
                : "14px",
          fontWeight: props.weight === "bold" ? "700" : "400",
        }}
      >
        {String(props.content ?? "")}
      </span>
    ),
    Button: ({ props, emit }) => (
      <button
        onClick={() => emit("press")}
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          fontWeight: "500",
          fontSize: "14px",
          backgroundColor:
            props.variant === "danger"
              ? "#fee2e2"
              : props.variant === "secondary"
                ? "#f3f4f6"
                : "#3b82f6",
          color:
            props.variant === "danger"
              ? "#dc2626"
              : props.variant === "secondary"
                ? "#374151"
                : "white",
        }}
      >
        {props.label}
      </button>
    ),
  },
  actions: {
    increment: async (_params, setState) => {
      setState((prev) => ({ ...prev, count: Number(prev.count || 0) + 1 }));
    },
    decrement: async (_params, setState) => {
      setState((prev) => ({
        ...prev,
        count: Math.max(0, Number(prev.count || 0) - 1),
      }));
    },
    reset: async (_params, setState) => {
      setState((prev) => ({ ...prev, count: 0 }));
    },
  },
});

// --- Spec (the UI tree, could be AI-generated) ---

const counterSpec: Spec = {
  root: "root",
  state: { count: 0 },
  elements: {
    root: {
      type: "Stack",
      props: { gap: 12, direction: "vertical" },
      children: ["controls", "milestone"],
    },
    controls: {
      type: "Stack",
      props: { gap: 12, direction: "horizontal", align: "center" },
      children: ["dec-btn", "count-text", "inc-btn", "reset-btn"],
    },
    "dec-btn": {
      type: "Button",
      props: { label: "-", variant: "secondary" },
      on: { press: { action: "decrement" } },
    },
    "count-text": {
      type: "Text",
      props: { content: { $state: "/count" }, size: "xl", weight: "bold" },
    },
    "inc-btn": {
      type: "Button",
      props: { label: "+", variant: "primary" },
      on: { press: { action: "increment" } },
    },
    "reset-btn": {
      type: "Button",
      props: { label: "Reset", variant: "danger" },
      on: { press: { action: "reset" } },
    },
    milestone: {
      type: "Text",
      props: { content: "Milestone: 10!", size: "sm" },
      visible: { $state: "/count", gte: 10 },
    },
  },
};

// --- Island Component ---

type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

export default function Counter() {
  const [state, setState] = useState<Record<string, unknown>>(
    counterSpec.state ?? {},
  );

  const stateRef = useRef(state);
  const setStateRef = useRef<SetState>(setState);
  stateRef.current = state;
  setStateRef.current = setState;

  const actionHandlers = useMemo(
    () =>
      createHandlers(
        () => setStateRef.current,
        () => stateRef.current,
      ),
    [],
  );

  return (
    <StateProvider initialState={state}>
      <VisibilityProvider>
        <ActionProvider handlers={actionHandlers}>
          <Renderer spec={counterSpec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

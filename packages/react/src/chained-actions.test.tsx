import { describe, it, expect } from "vitest";
import React from "react";
import { render, act, fireEvent, screen } from "@testing-library/react";
import type { Spec } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRenderProps,
} from "./renderer";
import { useStateStore } from "./contexts/state";

/**
 * Minimal Button component that calls emit("press") on click.
 */
function Button({ element, emit }: ComponentRenderProps<{ label: string }>) {
  return (
    <button data-testid="btn" onClick={() => emit("press")}>
      {element.props.label}
    </button>
  );
}

/**
 * Text component that renders its `text` prop.
 */
function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
  const value = element.props.text;
  return (
    <span data-testid={`text-${element.type}`}>
      {typeof value === "string" ? value : JSON.stringify(value)}
    </span>
  );
}

/**
 * Helper component that reads live state and exposes it via a data attribute
 * so we can assert against the store after actions fire.
 */
function StateProbe() {
  const { state } = useStateStore();
  return <pre data-testid="state-probe">{JSON.stringify(state)}</pre>;
}

const registry = {
  Button,
  Text,
};

describe("chained actions: live $state resolution (#141)", () => {
  it("setState after pushState sees the post-push value via $state", async () => {
    const spec: Spec = {
      state: { items: ["initial"], observed: "not yet set" },
      root: "main",
      elements: {
        main: {
          type: "Button",
          props: { label: "Add Item" },
          on: {
            press: [
              {
                action: "pushState",
                params: { statePath: "/items", value: "new-item" },
              },
              {
                action: "setState",
                params: {
                  statePath: "/observed",
                  value: { $state: "/items" },
                },
              },
            ],
          },
        },
      },
    };

    function App() {
      return (
        <JSONUIProvider registry={registry} initialState={spec.state}>
          <Renderer spec={spec} registry={registry} />
          <StateProbe />
        </JSONUIProvider>
      );
    }

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    const probe = screen.getByTestId("state-probe");
    const state = JSON.parse(probe.textContent!);

    expect(state.items).toEqual(["initial", "new-item"]);
    expect(state.observed).toEqual(["initial", "new-item"]);
  });

  it("multiple pushState + setState chain resolves correctly", async () => {
    const spec: Spec = {
      state: { items: [], snapshot: null },
      root: "main",
      elements: {
        main: {
          type: "Button",
          props: { label: "Go" },
          on: {
            press: [
              {
                action: "pushState",
                params: { statePath: "/items", value: "a" },
              },
              {
                action: "pushState",
                params: { statePath: "/items", value: "b" },
              },
              {
                action: "setState",
                params: {
                  statePath: "/snapshot",
                  value: { $state: "/items" },
                },
              },
            ],
          },
        },
      },
    };

    function App() {
      return (
        <JSONUIProvider registry={registry} initialState={spec.state}>
          <Renderer spec={spec} registry={registry} />
          <StateProbe />
        </JSONUIProvider>
      );
    }

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    const state = JSON.parse(screen.getByTestId("state-probe").textContent!);

    expect(state.items).toEqual(["a", "b"]);
    expect(state.snapshot).toEqual(["a", "b"]);
  });

  it("setState reading a path mutated by an earlier setState sees fresh value", async () => {
    const spec: Spec = {
      state: { counter: 0, counterCopy: -1 },
      root: "main",
      elements: {
        main: {
          type: "Button",
          props: { label: "Go" },
          on: {
            press: [
              {
                action: "setState",
                params: { statePath: "/counter", value: 42 },
              },
              {
                action: "setState",
                params: {
                  statePath: "/counterCopy",
                  value: { $state: "/counter" },
                },
              },
            ],
          },
        },
      },
    };

    function App() {
      return (
        <JSONUIProvider registry={registry} initialState={spec.state}>
          <Renderer spec={spec} registry={registry} />
          <StateProbe />
        </JSONUIProvider>
      );
    }

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    const state = JSON.parse(screen.getByTestId("state-probe").textContent!);

    expect(state.counter).toBe(42);
    expect(state.counterCopy).toBe(42);
  });
});

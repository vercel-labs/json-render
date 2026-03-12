import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";
import type { Spec } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRenderProps,
} from "./renderer";
import { useStateStore } from "./contexts/state";

// DO NOT destructure props — Solid requires proxy access
function Button(props: ComponentRenderProps<{ label: string }>) {
  return (
    <button data-testid="btn" onClick={() => props.emit("press")}>
      {props.element.props.label}
    </button>
  );
}

function Text(props: ComponentRenderProps<{ text: unknown }>) {
  const display = () => {
    const v = props.element.props.text;
    return typeof v === "string" ? v : JSON.stringify(v);
  };
  return <span data-testid={`text-${props.element.type}`}>{display()}</span>;
}

let probeGetSnapshot: (() => Record<string, unknown>) | undefined;

function StateProbe() {
  const ctx = useStateStore();
  probeGetSnapshot = ctx.getSnapshot;
  return <div data-testid="state-probe" />;
}

const registry = {
  Button,
  Text,
};

function getProbeState(): Record<string, unknown> {
  return probeGetSnapshot!();
}

describe("chained actions: live $state resolution (#141)", () => {
  it("setState after pushState sees the post-push value via $state", async () => {
    probeGetSnapshot = undefined;
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

    render(() => <App />);

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      const state = getProbeState();
      expect(state.items).toEqual(["initial", "new-item"]);
      expect(state.observed).toEqual(["initial", "new-item"]);
    });
  });

  it("multiple pushState + setState chain resolves correctly", async () => {
    probeGetSnapshot = undefined;
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

    render(() => <App />);

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      const state = getProbeState();
      expect(state.items).toEqual(["a", "b"]);
      expect(state.snapshot).toEqual(["a", "b"]);
    });
  });

  it("setState reading a path mutated by an earlier setState sees fresh value", async () => {
    probeGetSnapshot = undefined;
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

    render(() => <App />);

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      const state = getProbeState();
      expect(state.counter).toBe(42);
      expect(state.counterCopy).toBe(42);
    });
  });
});

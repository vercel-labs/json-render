import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  markDevtoolsActive,
  createStateStore,
  type Spec,
} from "@json-render/core";
import { Renderer } from "./renderer";
import { JSONUIProvider } from "./index";

describe("Renderer", () => {
  it("is a valid component function", () => {
    expect(typeof Renderer).toBe("function");
  });

  it("accepts null spec", () => {
    const props = {
      spec: null,
      registry: {},
    };
    expect(props.spec).toBeNull();
    expect(props.registry).toEqual({});
  });

  it("accepts spec without root", () => {
    const props = {
      spec: { root: "", elements: {} },
      registry: {},
    };
    expect(props.spec.root).toBe("");
    expect(props.spec.elements).toEqual({});
  });

  it("accepts loading prop", () => {
    const props = {
      spec: null,
      registry: {},
      loading: true,
    };
    expect(props.loading).toBe(true);
  });

  it("accepts fallback prop", () => {
    const Fallback = () => {
      const el = document.createElement("div");
      el.textContent = "Unknown component";
      return el;
    };

    const props = {
      spec: null,
      registry: {},
      fallback: Fallback,
    };
    expect(props.fallback).toBe(Fallback);
  });

  it("keeps content and reactive children when devtools activates after mounting", () => {
    const store = createStateStore({ message: "Visible renderer" });
    const spec: Spec = {
      root: "card",
      elements: {
        card: { type: "Card", props: {}, children: ["text"] },
        text: { type: "Text", props: { text: { $state: "/message" } } },
      },
    };
    const registry = {
      Card: (ctx: { children?: import("solid-js").JSX.Element }) => (
        <div>{ctx.children}</div>
      ),
      Text: (ctx: { element: { props: Record<string, unknown> } }) => (
        <p>{String(ctx.element.props.text)}</p>
      ),
    };
    const view = render(() => (
      <JSONUIProvider registry={registry} store={store}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));
    expect(view.container.textContent).toBe("Visible renderer");
    const release = markDevtoolsActive();
    try {
      expect(
        view.container.querySelector('[data-jr-key="card"]')?.textContent,
      ).toBe("Visible renderer");
      expect(
        view.container.querySelector('[data-jr-key="text"]')?.textContent,
      ).toBe("Visible renderer");
      store.set("/message", "Updated renderer");
      expect(view.container.textContent).toBe("Updated renderer");
    } finally {
      release();
    }
    expect(view.container.querySelector("[data-jr-key]")).toBeNull();
    expect(view.container.textContent).toBe("Updated renderer");
  });
});

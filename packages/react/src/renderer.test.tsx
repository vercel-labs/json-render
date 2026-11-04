import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { defineCatalog, type Spec } from "@json-render/core";
import { z } from "zod";
import {
  defineRegistry,
  JSONUIProvider,
  Renderer,
  type ComponentRenderProps,
} from "./renderer";
import { schema } from "./schema";
import type { SetState } from "./catalog-types";

describe("Renderer", () => {
  it("renders null for null spec", () => {
    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
    });
    expect(element).toBeDefined();
    expect(element.props.spec).toBeNull();
  });

  it("renders null for spec without root", () => {
    const element = React.createElement(Renderer, {
      spec: { root: "", elements: {} },
      registry: {},
    });
    expect(element).toBeDefined();
  });

  it("accepts loading prop", () => {
    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
      loading: true,
    });
    expect(element.props.loading).toBe(true);
  });

  it("accepts fallback prop", () => {
    const Fallback = () =>
      React.createElement("div", null, "Unknown component");

    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
      fallback: Fallback,
    });
    expect(element.props.fallback).toBe(Fallback);
  });

  it("renders named slots through defineRegistry", () => {
    const catalog = defineCatalog(schema, {
      components: {
        Layout: {
          props: z.object({}),
          slots: ["default", "header", "footer"],
        },
        Text: {
          props: z.object({ text: z.string() }),
          slots: [],
        },
      },
      actions: {},
    });
    const { registry } = defineRegistry(catalog, {
      components: {
        Layout: ({ children, slots }) => (
          <section>
            <header data-testid="header-slot">{slots?.header}</header>
            <main data-testid="default-slot">{children}</main>
            <footer data-testid="footer-slot">{slots?.footer}</footer>
          </section>
        ),
        Text: ({ props }) => <span>{props.text}</span>,
      },
    });
    const spec: Spec = {
      root: "layout",
      elements: {
        layout: {
          type: "Layout",
          props: {},
          children: ["main"],
          slots: {
            header: ["header"],
            footer: ["footer"],
          },
        },
        header: { type: "Text", props: { text: "Header" } },
        main: { type: "Text", props: { text: "Main" } },
        footer: { type: "Text", props: { text: "Footer" } },
      },
    };

    render(
      <JSONUIProvider registry={registry}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );

    expect(screen.getByTestId("header-slot").textContent).toBe("Header");
    expect(screen.getByTestId("default-slot").textContent).toBe("Main");
    expect(screen.getByTestId("footer-slot").textContent).toBe("Footer");
  });

  it.each(["subitems", "/subitems"])(
    "resolves nested repeat statePath %s from parent $item scope",
    (itemPath) => {
      function Group({ children }: ComponentRenderProps) {
        return <div>{children}</div>;
      }

      function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
        return (
          <span data-testid="item-text">{String(element.props.text)}</span>
        );
      }

      const spec: Spec = {
        root: "groups",
        state: {
          groups: [
            { subitems: [{ label: "a1" }, { label: "a2" }] },
            { subitems: [{ label: "b1" }] },
          ],
        },
        elements: {
          groups: {
            type: "Group",
            props: {},
            repeat: { statePath: "/groups" },
            children: ["subitems"],
          },
          subitems: {
            type: "Group",
            props: {},
            repeat: { statePath: { $item: itemPath } },
            children: ["label"],
          },
          label: {
            type: "Text",
            props: { text: { $item: "label" } },
          },
        },
      };

      render(
        <JSONUIProvider registry={{ Group, Text }} initialState={spec.state}>
          <Renderer spec={spec} registry={{ Group, Text }} />
        </JSONUIProvider>,
      );

      expect(
        screen.getAllByTestId("item-text").map((el) => el.textContent),
      ).toEqual(["a1", "a2", "b1"]);
    },
  );

  it("does not fall back to root state for $item outside repeat scope", () => {
    function Group({ children }: ComponentRenderProps) {
      return <div>{children}</div>;
    }

    function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
      return <span data-testid="item-text">{String(element.props.text)}</span>;
    }

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const spec: Spec = {
      root: "items",
      state: { items: [{ label: "must-not-render" }] },
      elements: {
        items: {
          type: "Group",
          props: {},
          repeat: { statePath: { $item: "items" } },
          children: ["label"],
        },
        label: {
          type: "Text",
          props: { text: { $item: "label" } },
        },
      },
    };

    const { queryAllByTestId } = render(
      <JSONUIProvider registry={{ Group, Text }} initialState={spec.state}>
        <Renderer spec={spec} registry={{ Group, Text }} />
      </JSONUIProvider>,
    );

    expect(queryAllByTestId("item-text")).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      "[json-render] $item in repeat.statePath used outside of a repeat scope",
    );
    warn.mockRestore();
  });
});

describe("defineRegistry handlers without a state setter", () => {
  const catalog = defineCatalog(schema, {
    components: {
      Button: { props: z.object({ label: z.string() }), slots: [] },
    },
    actions: { run: { description: "Run an action" } },
  });
  const spec: Spec = {
    root: "btn",
    elements: {
      btn: {
        type: "Button",
        props: { label: "Go" },
        on: { press: { action: "run", params: { value: 1 } } },
      },
    },
  };

  function mount(action: (...args: never[]) => unknown, getSetState: never) {
    const { registry, handlers } = defineRegistry(catalog, {
      components: {
        Button: ({ props, emit }) => (
          <button data-testid="btn" onClick={() => emit("press")}>
            {props.label}
          </button>
        ),
      },
      actions: { run: action as never },
    });
    render(
      <JSONUIProvider
        registry={registry}
        handlers={handlers(getSetState, () => ({}))}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
  }

  it("invokes the action once with a no-op setter", async () => {
    const action = vi.fn(async (_p: unknown, setState: SetState) => {
      setState((prev) => prev);
    });
    mount(action, (() => undefined) as never);
    fireEvent.click(screen.getByTestId("btn"));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith({ value: 1 }, expect.any(Function), {});
  });

  it("passes the real setter when one is provided", async () => {
    const setState = vi.fn();
    const action = vi.fn(async (_p: unknown, set: SetState) => {
      set((prev) => prev);
    });
    mount(action, (() => setState) as never);
    fireEvent.click(screen.getByTestId("btn"));
    await waitFor(() => expect(setState).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("still surfaces async action errors", async () => {
    const action = vi.fn(async () => {
      throw new Error("boom");
    });
    const { handlers } = defineRegistry(catalog, {
      components: { Button: () => null },
      actions: { run: action },
    });
    const run = handlers(
      () => undefined,
      () => ({}),
    ).run;
    await expect(run!({})).rejects.toThrow("boom");
  });
});

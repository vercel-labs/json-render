import { act, render } from "@testing-library/react";
import {
  createStateStore,
  defineDirective,
  getByPath,
  type Spec,
} from "@json-render/core";
import React from "react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { JSONUIProvider, Renderer, type ComponentRegistry } from "./renderer";

const METRIC_COUNT = 20;

const registry: ComponentRegistry = {
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ element }) => (
    <span data-testid={String(element.props.id)}>
      {String(element.props.text)}
    </span>
  ),
};

function textOf(view: ReturnType<typeof render>, id: string) {
  return view
    .getAllByTestId(id)
    .map((node) => node.textContent)
    .join("|");
}

function makeMetricSpec(): Spec {
  const children = Array.from(
    { length: METRIC_COUNT },
    (_, index) => `metric-${index}`,
  );
  return {
    root: "root",
    elements: {
      root: { type: "Stack", props: {}, children },
      ...Object.fromEntries(
        children.map((key, index) => [
          key,
          {
            type: "Text",
            props: {
              id: key,
              text: index === 0 ? { $state: "/watched" } : key,
              probe: { $computed: "count", args: { key } },
            },
          },
        ]),
      ),
    },
  };
}

describe("state subscriptions", () => {
  it("re-runs only the elements that read a changed state path", async () => {
    const executions: Record<string, number> = {};
    const functions = {
      count: (args: Record<string, unknown>) => {
        const key = String(args.key);
        executions[key] = (executions[key] ?? 0) + 1;
        return key;
      },
    };
    const store = createStateStore({ watched: 0 });
    const spec = makeMetricSpec();
    const view = render(
      <JSONUIProvider registry={registry} store={store} functions={functions}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    for (const key of Object.keys(executions)) executions[key] = 0;

    await act(async () => store.set("/unrelated", 1));
    expect(Object.values(executions).every((count) => count === 0)).toBe(true);

    await act(async () => store.set("/watched", 1));
    expect(executions["metric-0"]).toBe(1);
    expect(
      Object.entries(executions).filter(
        ([key, count]) => key !== "metric-0" && count > 0,
      ),
    ).toEqual([]);
    expect(textOf(view, "metric-0")).toBe("1");
  });

  it("reads the current value when a spec change points an element at a new path", async () => {
    const store = createStateStore({ a: "a0", b: "b0" });
    const specFor = (path: string): Spec => ({
      root: "text",
      elements: {
        text: { type: "Text", props: { id: "text", text: { $state: path } } },
      },
    });
    const view = render(
      <JSONUIProvider registry={registry} store={store}>
        <Renderer spec={specFor("/a")} registry={registry} />
      </JSONUIProvider>,
    );
    await act(async () => store.set("/b", "b1"));
    expect(textOf(view, "text")).toBe("a0");

    view.rerender(
      <JSONUIProvider registry={registry} store={store}>
        <Renderer spec={specFor("/b")} registry={registry} />
      </JSONUIProvider>,
    );
    expect(textOf(view, "text")).toBe("b1");
  });

  it("updates visibility, templates, conditions and parent replacements", async () => {
    const store = createStateStore({
      show: false,
      user: { name: "Ann" },
      mode: "light",
    });
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: {},
          children: ["gated", "greeting", "theme"],
        },
        gated: {
          type: "Text",
          props: { id: "gated", text: "shown" },
          visible: { $state: "/show" },
        },
        greeting: {
          type: "Text",
          props: { id: "greeting", text: { $template: "Hi ${/user/name}" } },
        },
        theme: {
          type: "Text",
          props: {
            id: "theme",
            text: {
              $cond: { $state: "/mode", eq: "dark" },
              $then: "dark",
              $else: "light",
            },
          },
        },
      },
    };
    const view = render(
      <JSONUIProvider registry={registry} store={store}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.queryByTestId("gated")).toBeNull();

    await act(async () => store.set("/show", true));
    expect(textOf(view, "gated")).toBe("shown");

    await act(async () => store.set("/user/name", "Bob"));
    expect(textOf(view, "greeting")).toBe("Hi Bob");

    await act(async () => store.set("/user", { name: "Cy" }));
    expect(textOf(view, "greeting")).toBe("Hi Cy");

    await act(async () => store.set("/mode", "dark"));
    expect(textOf(view, "theme")).toBe("dark");
  });

  it("re-runs only the repeat item whose state changed", async () => {
    const executions: Record<string, number> = {};
    const functions = {
      count: (args: Record<string, unknown>) => {
        const key = String(args.key);
        executions[key] = (executions[key] ?? 0) + 1;
        return key;
      },
    };
    const store = createStateStore({
      todos: [
        { id: "t0", title: "first" },
        { id: "t1", title: "second" },
        { id: "t2", title: "third" },
      ],
    });
    const spec: Spec = {
      root: "list",
      elements: {
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/todos", key: "id" },
          children: ["title"],
        },
        title: {
          type: "Text",
          props: {
            id: "title",
            text: { $bindItem: "title" },
            probe: { $computed: "count", args: { key: { $item: "id" } } },
          },
        },
      },
    };
    const view = render(
      <JSONUIProvider registry={registry} store={store} functions={functions}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    for (const key of Object.keys(executions)) executions[key] = 0;

    await act(async () => store.set("/todos/1/title", "edited"));
    expect(textOf(view, "title")).toBe("first|edited|third");
    expect(executions).toEqual({ t0: 0, t1: 1, t2: 0 });

    await act(async () =>
      store.set("/todos", [
        ...(getByPath(store.getSnapshot(), "/todos") as unknown[]),
        { id: "t3", title: "fourth" },
      ]),
    );
    expect(textOf(view, "title")).toBe("first|edited|third|fourth");
  });

  it("keeps custom directives reading the whole state model", async () => {
    const readTheme = defineDirective({
      name: "$theme",
      schema: z.object({ $theme: z.literal(true) }),
      resolve(_value, ctx) {
        return String(getByPath(ctx.stateModel, "/theme"));
      },
    });
    const directives = [readTheme];
    const store = createStateStore({ theme: "light" });
    const spec: Spec = {
      root: "text",
      elements: {
        text: {
          type: "Text",
          props: { id: "text", text: { $theme: true } },
        },
      },
    };
    const view = render(
      <JSONUIProvider registry={registry} store={store} directives={directives}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    expect(textOf(view, "text")).toBe("light");

    await act(async () => store.set("/theme", "dark"));
    expect(textOf(view, "text")).toBe("dark");
  });
});

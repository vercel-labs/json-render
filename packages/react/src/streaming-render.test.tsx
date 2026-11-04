import { act, render } from "@testing-library/react";
import {
  defineDirective,
  resolvePropValue,
  type Spec,
} from "@json-render/core";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { buildSpecFromParts, type DataPart } from "./hooks";
import { JSONUIProvider, Renderer, type ComponentRegistry } from "./renderer";
import { useStateStore } from "./contexts/state";

const ELEMENT_COUNT = 26;
const PATCH_COUNT = 200;

function makeSpec(): Spec {
  const children = Array.from(
    { length: ELEMENT_COUNT },
    (_, index) => `metric-${index}`,
  );
  return {
    root: "root",
    state: Object.fromEntries(children.map((key, index) => [key, index])),
    elements: {
      root: { type: "Stack", props: {}, children },
      ...Object.fromEntries(
        children.map((key) => [
          key,
          {
            type: "Metric",
            props: { value: { $bindState: `/${key}` }, revision: 0 },
          },
        ]),
      ),
    },
  };
}

function patchPart(revision: number): DataPart {
  return {
    type: "data-spec",
    data: {
      type: "patch",
      patch: {
        op: "replace",
        path: "/elements/metric-0/props/revision",
        value: revision,
      },
    },
  };
}

describe("streaming render stability", () => {
  it("does not execute untouched catalog components for each patch", async () => {
    const parts: DataPart[] = [
      { type: "data-spec", data: { type: "flat", spec: makeSpec() } },
    ];
    let stackRenders = 0;
    let metricRenders = 0;
    const registry: ComponentRegistry = {
      Stack: ({ children }) => {
        stackRenders += 1;
        return <>{children}</>;
      },
      Metric: () => {
        metricRenders += 1;
        return null;
      },
    };
    const initialSpec = buildSpecFromParts(parts);
    const view = render(
      <JSONUIProvider registry={registry} initialState={initialSpec?.state}>
        <Renderer spec={initialSpec} registry={registry} />
      </JSONUIProvider>,
    );

    for (let revision = 1; revision <= PATCH_COUNT; revision += 1) {
      await act(async () => {
        parts.push(patchPart(revision));
        const spec = buildSpecFromParts(parts);
        view.rerender(
          <JSONUIProvider registry={registry} initialState={spec?.state}>
            <Renderer spec={spec} registry={registry} />
          </JSONUIProvider>,
        );
      });
    }
    expect(stackRenders).toBe(PATCH_COUNT + 1);
    expect(metricRenders).toBe(ELEMENT_COUNT + PATCH_COUNT);
    expect(initialSpec?.elements["metric-1"]?.props.revision).toBe(0);
  });

  it("does not execute untouched element renderers for each patch", async () => {
    const parts: DataPart[] = [
      { type: "data-spec", data: { type: "flat", spec: makeSpec() } },
    ];
    for (const [key, element] of Object.entries(parts[0]!.data.spec.elements)) {
      if (key !== "root") element.props.probe = { $count: key };
    }
    let elementExecutions = 0;
    const countDirective = defineDirective({
      name: "$count",
      resolve(value) {
        elementExecutions += 1;
        return value.$count;
      },
    });
    const directives = [countDirective];
    const registry: ComponentRegistry = {
      Stack: ({ children }) => <>{children}</>,
      Metric: () => null,
    };
    const initialSpec = buildSpecFromParts(parts);
    const view = render(
      <JSONUIProvider
        registry={registry}
        initialState={initialSpec?.state}
        directives={directives}
      >
        <Renderer spec={initialSpec} registry={registry} />
      </JSONUIProvider>,
    );

    for (let revision = 1; revision <= PATCH_COUNT; revision += 1) {
      await act(async () => {
        parts.push(patchPart(revision));
        const spec = buildSpecFromParts(parts);
        view.rerender(
          <JSONUIProvider
            registry={registry}
            initialState={spec?.state}
            directives={directives}
          >
            <Renderer spec={spec} registry={registry} />
          </JSONUIProvider>,
        );
      });
    }
    expect(elementExecutions).toBe(ELEMENT_COUNT + PATCH_COUNT);
  });

  it("keeps binding identity stable across state writes", () => {
    let writes = 0;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    function WritingMetric({
      bindings,
    }: React.ComponentProps<ComponentRegistry[string]>) {
      const { set } = useStateStore();
      React.useEffect(() => {
        writes += 1;
        set("/metric-0", writes);
      }, [bindings, set]);
      return null;
    }
    const spec = makeSpec();
    const registry: ComponentRegistry = {
      Stack: ({ children }) => <>{children}</>,
      Metric: WritingMetric,
    };

    render(
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    const output = error.mock.calls.flat().map(String).join("\n");
    expect(output).not.toMatch(/Maximum update depth exceeded/);
    expect(writes).toBe(ELEMENT_COUNT);
    error.mockRestore();
  });

  it("preserves state context updates for catalog components", async () => {
    let metricRenders = 0;
    let write: (() => void) | undefined;
    function Metric() {
      metricRenders += 1;
      const { set } = useStateStore();
      write = () => set("/metric-0", 999);
      return null;
    }
    const spec = makeSpec();
    const registry: ComponentRegistry = {
      Stack: ({ children }) => <>{children}</>,
      Metric,
    };
    render(
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    expect(metricRenders).toBe(ELEMENT_COUNT);
    await act(async () => write?.());
    expect(metricRenders).toBe(ELEMENT_COUNT * 2);
  });

  it("renders a child that becomes available in a later complete spec", () => {
    const registry: ComponentRegistry = {
      Stack: ({ children }) => <>{children}</>,
      Metric: ({ element }) => <span>{String(element.props.revision)}</span>,
    };
    const initial: Spec = {
      root: "root",
      elements: {
        root: { type: "Stack", props: {}, children: ["late"] },
      },
    };
    const view = render(
      <JSONUIProvider registry={registry}>
        <Renderer spec={initial} registry={registry} loading />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("");
    const complete: Spec = {
      root: "root",
      elements: {
        root: { type: "Stack", props: {}, children: ["late"] },
        late: { type: "Metric", props: { revision: 1 } },
      },
    };
    view.rerender(
      <JSONUIProvider registry={registry}>
        <Renderer spec={complete} registry={registry} loading={false} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("1");
  });

  it("updates direct renderer consumers with fresh complete specs", () => {
    const registry: ComponentRegistry = {
      Stack: ({ children }) => <>{children}</>,
      Metric: ({ element }) => <span>{String(element.props.revision)}</span>,
    };
    const first = makeSpec();
    const view = render(
      <JSONUIProvider registry={registry} initialState={first.state}>
        <Renderer spec={first} registry={registry} />
      </JSONUIProvider>,
    );
    const next = structuredClone(first);
    next.elements["metric-0"]!.props.revision = 9;
    view.rerender(
      <JSONUIProvider registry={registry} initialState={next.state}>
        <Renderer spec={next} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent?.startsWith("9")).toBe(true);
  });

  it("detects nested mutations after reusing an unchanged snapshot", () => {
    const registry: ComponentRegistry = {
      Value: ({ element }) => <span>{JSON.stringify(element.props)}</span>,
    };
    const nested = { text: "before" };
    const spec: Spec = {
      root: "value",
      elements: { value: { type: "Value", props: { nested } } },
    };
    const ui = () => (
      <JSONUIProvider registry={registry}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    );
    const view = render(ui());
    view.rerender(ui());
    nested.text = "after";
    view.rerender(ui());
    expect(view.container.textContent).toBe('{"nested":{"text":"after"}}');
    delete spec.elements.value!.props.nested;
    view.rerender(ui());
    expect(view.container.textContent).toBe("{}");
  });

  it("does not preserve stale prop keys with undefined values", () => {
    const registry: ComponentRegistry = {
      Value: ({ element }) => (
        <span>{Object.keys(element.props).join(",")}</span>
      ),
    };
    const first: Spec = {
      root: "value",
      elements: { value: { type: "Value", props: { foo: undefined } } },
    };
    const view = render(
      <JSONUIProvider registry={registry}>
        <Renderer spec={first} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("foo");
    const second: Spec = {
      root: "value",
      elements: { value: { type: "Value", props: { bar: undefined } } },
    };
    view.rerender(
      <JSONUIProvider registry={registry}>
        <Renderer spec={second} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("bar");
  });

  it("recovers when props arrive after the element type", () => {
    const parts: DataPart[] = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "value" },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/value",
            value: { type: "Value" },
          },
        },
      },
    ];
    const registry: ComponentRegistry = {
      Value: ({ element }) => (
        <span>{String(element.props.label ?? "waiting")}</span>
      ),
    };
    const incomplete = buildSpecFromParts(parts);
    const view = render(
      <JSONUIProvider registry={registry}>
        <Renderer spec={incomplete} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("waiting");

    parts.push({
      type: "data-spec",
      data: {
        type: "patch",
        patch: {
          op: "add",
          path: "/elements/value/props",
          value: { label: "ready" },
        },
      },
    });
    const complete = buildSpecFromParts(parts);
    view.rerender(
      <JSONUIProvider registry={registry}>
        <Renderer spec={complete} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("ready");
  });

  it("keeps repeated event callbacks bound to the current item", async () => {
    let updateItem: (() => void) | undefined;
    const received: unknown[] = [];
    function Controls() {
      const { set } = useStateStore();
      updateItem = () => set("/items/0", { id: "one", label: "updated" });
      return null;
    }
    const spec: Spec = {
      root: "list",
      state: { items: [{ id: "one", label: "initial" }] },
      elements: {
        list: {
          type: "List",
          props: {},
          repeat: { statePath: "/items", key: "id" },
          children: ["button"],
        },
        button: {
          type: "Button",
          props: {},
          on: {
            press: {
              action: "select",
              params: {
                label: {
                  $computed: "itemLabel",
                  args: { label: { $item: "label" } },
                },
              },
            },
          },
        },
      },
    };
    const registry: ComponentRegistry = {
      List: ({ children }) => <>{children}</>,
      Button: ({ emit }) => <button onClick={() => emit("press")}>pick</button>,
    };
    const view = render(
      <JSONUIProvider
        registry={registry}
        initialState={spec.state}
        functions={{ itemLabel: ({ label }) => label }}
        handlers={{ select: ({ label }) => received.push(label) }}
      >
        <Controls />
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );

    await act(async () => updateItem?.());
    await act(async () => view.getByRole("button").click());
    expect(received).toEqual(["updated"]);
  });

  it("refreshes resolved props when functions and directives change", () => {
    const spec: Spec = {
      root: "value",
      elements: {
        value: {
          type: "Value",
          props: {
            computed: { $computed: "label" },
            directed: { $prefix: "value" },
          },
        },
      },
    };
    const registry: ComponentRegistry = {
      Value: ({ element }) => (
        <span>{`${element.props.computed}:${element.props.directed}`}</span>
      ),
    };
    const firstDirective = defineDirective({
      name: "$prefix",
      resolve(value, ctx) {
        return `first-${resolvePropValue(value.$prefix, ctx)}`;
      },
    });
    const secondDirective = defineDirective({
      name: "$prefix",
      resolve(value, ctx) {
        return `second-${resolvePropValue(value.$prefix, ctx)}`;
      },
    });
    const view = render(
      <JSONUIProvider
        registry={registry}
        functions={{ label: () => "first" }}
        directives={[firstDirective]}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("first:first-value");

    view.rerender(
      <JSONUIProvider
        registry={registry}
        functions={{ label: () => "second" }}
        directives={[secondDirective]}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("second:second-value");
  });

  it("keeps event callbacks fresh when functions and directives change", async () => {
    const received: unknown[] = [];
    const spec: Spec = {
      root: "button",
      elements: {
        button: {
          type: "Button",
          props: {},
          on: {
            press: {
              action: "select",
              params: {
                computed: { $computed: "label" },
                directed: { $prefix: "value" },
              },
            },
          },
        },
      },
    };
    const registry: ComponentRegistry = {
      Button: ({ emit }) => <button onClick={() => emit("press")}>pick</button>,
    };
    const firstDirective = defineDirective({
      name: "$prefix",
      resolve(value) {
        return `first-${String(value.$prefix)}`;
      },
    });
    const secondDirective = defineDirective({
      name: "$prefix",
      resolve(value) {
        return `second-${String(value.$prefix)}`;
      },
    });
    const handlers = {
      select: (params: Record<string, unknown>) => received.push(params),
    };
    const view = render(
      <JSONUIProvider
        registry={registry}
        functions={{ label: () => "first" }}
        directives={[firstDirective]}
        handlers={handlers}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );

    view.rerender(
      <JSONUIProvider
        registry={registry}
        functions={{ label: () => "second" }}
        directives={[secondDirective]}
        handlers={handlers}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    await act(async () => view.getByRole("button").click());
    expect(received).toEqual([
      { computed: "second", directed: "second-value" },
    ]);
  });

  it("supports non-serializable resolved state and repeat items", () => {
    const cyclic: Record<string, unknown> = { value: 1 };
    cyclic.self = cyclic;
    const spec: Spec = {
      root: "list",
      state: { cyclic, items: [{ id: 1n }] },
      elements: {
        list: {
          type: "List",
          props: { value: { $state: "/cyclic" } },
          repeat: { statePath: "/items" },
          children: ["item"],
        },
        item: { type: "Item", props: { id: { $item: "id" } } },
      },
    };
    const registry: ComponentRegistry = {
      List: ({ children }) => <>{children}</>,
      Item: ({ element }) => <span>{String(element.props.id)}</span>,
    };

    const view = render(
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("1");
  });

  it("propagates shared-child updates through a DAG", () => {
    const registry: ComponentRegistry = {
      Stack: ({ children }) => <>{children}</>,
      Value: ({ element }) => <span>{String(element.props.revision)}</span>,
    };
    const first: Spec = {
      root: "root",
      elements: {
        root: { type: "Stack", props: {}, children: ["left", "right"] },
        left: { type: "Stack", props: {}, children: ["shared"] },
        right: { type: "Stack", props: {}, children: ["shared"] },
        shared: { type: "Value", props: { revision: 1 } },
      },
    };
    const view = render(
      <JSONUIProvider registry={registry}>
        <Renderer spec={first} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("11");
    const second = structuredClone(first);
    second.elements.shared!.props.revision = 2;
    view.rerender(
      <JSONUIProvider registry={registry}>
        <Renderer spec={second} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("22");
  });

  it("terminates signature computation for cyclic element graphs", () => {
    const spec: Spec = {
      root: "",
      elements: {
        first: { type: "Node", props: {}, children: ["second"] },
        second: { type: "Node", props: {}, children: ["first"] },
      },
    };
    expect(() =>
      render(<Renderer spec={spec} registry={{ Node: () => null }} />),
    ).not.toThrow();
  });

  it("stops a watch action chain when its element unmounts", async () => {
    let setValue: (() => void) | undefined;
    let release: (() => void) | undefined;
    const firstAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const secondAction = vi.fn();
    function Controls() {
      const { set } = useStateStore();
      setValue = () => set("/value", "changed");
      return null;
    }
    const registry: ComponentRegistry = {
      Stack: ({ children }) => <>{children}</>,
      Watcher: () => null,
    };
    const first: Spec = {
      root: "root",
      state: { value: "initial" },
      elements: {
        root: { type: "Stack", props: {}, children: ["watcher"] },
        watcher: {
          type: "Watcher",
          props: {},
          watch: {
            "/value": [{ action: "first" }, { action: "second" }],
          },
        },
      },
    };
    const handlers = { first: firstAction, second: secondAction };
    const view = render(
      <JSONUIProvider
        registry={registry}
        initialState={first.state}
        handlers={handlers}
      >
        <Controls />
        <Renderer spec={first} registry={registry} />
      </JSONUIProvider>,
    );
    await act(async () => setValue?.());
    expect(firstAction).toHaveBeenCalledTimes(1);
    const second: Spec = {
      ...first,
      elements: {
        ...first.elements,
        root: { type: "Stack", props: {}, children: [] },
      },
    };
    view.rerender(
      <JSONUIProvider
        registry={registry}
        initialState={first.state}
        handlers={handlers}
      >
        <Controls />
        <Renderer spec={second} registry={registry} />
      </JSONUIProvider>,
    );
    await act(async () => release?.());
    expect(secondAction).not.toHaveBeenCalled();
  });

  it("recovers a catalog component after a corrective patch", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const registry: ComponentRegistry = {
      Value: ({ element }) => {
        if (element.props.revision === 0) throw new Error("incomplete");
        return <span>{String(element.props.revision)}</span>;
      },
    };
    const first: Spec = {
      root: "value",
      elements: { value: { type: "Value", props: { revision: 0 } } },
    };
    const view = render(
      <JSONUIProvider registry={registry}>
        <Renderer spec={first} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("");
    const second: Spec = {
      root: "value",
      elements: { value: { type: "Value", props: { revision: 1 } } },
    };
    view.rerender(
      <JSONUIProvider registry={registry}>
        <Renderer spec={second} registry={registry} />
      </JSONUIProvider>,
    );
    expect(view.container.textContent).toBe("1");
    error.mockRestore();
  });

  it("computes signatures for deep element graphs without recursion", () => {
    const elements: Spec["elements"] = {};
    for (let index = 0; index < 12_000; index += 1) {
      elements[`node-${index}`] = {
        type: "Node",
        props: {},
        children: index === 11_999 ? [] : [`node-${index + 1}`],
      };
    }
    const spec: Spec = { root: "", elements };
    expect(() =>
      render(<Renderer spec={spec} registry={{ Node: () => null }} />),
    ).not.toThrow();
  });
});

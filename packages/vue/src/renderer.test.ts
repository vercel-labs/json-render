import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, type Component } from "vue";
import { mount } from "@vue/test-utils";
import type { Spec } from "@json-render/core";
import { StateProvider } from "./composables/state";
import { VisibilityProvider } from "./composables/visibility";
import { ActionProvider } from "./composables/actions";
import { ValidationProvider } from "./composables/validation";
import { Renderer, defineRegistry, type ComponentRegistry } from "./renderer";

// ---------------------------------------------------------------------------
// Minimal test catalog and registry
// ---------------------------------------------------------------------------

// defineRegistry ignores the catalog object at runtime — use any cast
const catalog = {} as any;

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => {
      const p = props as Record<string, unknown>;
      return h(
        "div",
        { "data-type": "card", "data-title": String(p["title"] ?? "") },
        [String(p["title"] ?? ""), children],
      );
    },
    Button: ({ props, emit }) => {
      const p = props as Record<string, unknown>;
      return h(
        "button",
        { "data-type": "button", onClick: () => emit("press") },
        String(p["label"] ?? ""),
      );
    },
  },
});

// ---------------------------------------------------------------------------
// Mount helper: wraps in the full provider chain required by ElementRenderer
// ---------------------------------------------------------------------------

function mountRenderer(
  spec: Spec | null,
  reg: ComponentRegistry = registry,
  extraProps: Record<string, unknown> = {},
  handlers: Record<
    string,
    (params: Record<string, unknown>) => Promise<void>
  > = {},
  initialState: Record<string, unknown> = {},
) {
  return mount(StateProvider as Component, {
    props: { initialState } as any,
    slots: {
      default: () =>
        h(VisibilityProvider as Component, null, {
          default: () =>
            h(ValidationProvider as Component, null, {
              default: () =>
                h(ActionProvider as Component, { handlers } as any, {
                  default: () =>
                    h(Renderer, { spec, registry: reg, ...extraProps }),
                }),
            }),
        }),
    },
  });
}

// ---------------------------------------------------------------------------
// defineRegistry tests
// ---------------------------------------------------------------------------

describe("defineRegistry", () => {
  it("wraps a render function and returns a Vue component", () => {
    const result = defineRegistry(catalog, {
      components: {
        MyComp: () => h("span", null, "hello"),
      },
    });
    expect(result.registry).toBeDefined();
    expect(result.registry["MyComp"]).toBeDefined();
  });

  it("component receives resolved props from the spec element", () => {
    const spec: Spec = {
      root: "btn1",
      elements: {
        btn1: { type: "Button", props: { label: "Press me" } },
      },
    };
    const wrapper = mountRenderer(spec);
    expect(wrapper.find("[data-type='button']").text()).toBe("Press me");
  });

  it("children is passed for container components", () => {
    const spec: Spec = {
      root: "card1",
      elements: {
        card1: {
          type: "Card",
          props: { title: "My Card" },
          children: ["btn1"],
        },
        btn1: { type: "Button", props: { label: "Click" } },
      },
    };
    const wrapper = mountRenderer(spec);
    expect(wrapper.find("[data-type='card']").exists()).toBe(true);
    expect(wrapper.find("[data-type='button']").exists()).toBe(true);
  });

  it("emit('press') fires the corresponding on.press action", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const spec: Spec = {
      root: "btn1",
      elements: {
        btn1: {
          type: "Button",
          props: { label: "Click" },
          on: { press: { action: "myAction" } },
        },
      },
    };
    const wrapper = mountRenderer(spec, registry, {}, { myAction: handler });
    await wrapper.find("[data-type='button']").trigger("click");
    expect(handler).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Renderer tests
// ---------------------------------------------------------------------------

describe("Renderer", () => {
  it("renders a single-element spec", () => {
    const spec: Spec = {
      root: "btn1",
      elements: {
        btn1: { type: "Button", props: { label: "Go" } },
      },
    };
    const wrapper = mountRenderer(spec);
    expect(wrapper.find("[data-type='button']").exists()).toBe(true);
    expect(wrapper.find("[data-type='button']").text()).toBe("Go");
  });

  it("renders a nested spec (parent contains a child by key reference)", () => {
    const spec: Spec = {
      root: "card1",
      elements: {
        card1: {
          type: "Card",
          props: { title: "Root" },
          children: ["btn1"],
        },
        btn1: { type: "Button", props: { label: "Action" } },
      },
    };
    const wrapper = mountRenderer(spec);
    const card = wrapper.find("[data-type='card']");
    expect(card.exists()).toBe(true);
    expect(card.find("[data-type='button']").exists()).toBe(true);
  });

  it("uses fallback component for unknown element types", () => {
    const fallback = defineComponent({
      setup() {
        return () => h("span", { "data-type": "fallback" }, "fallback");
      },
    });
    const spec: Spec = {
      root: "el1",
      elements: {
        el1: { type: "Unknown", props: {} },
      },
    };
    const wrapper = mountRenderer(spec, registry, { fallback });
    expect(wrapper.find("[data-type='fallback']").exists()).toBe(true);
  });

  it("passes loading prop through to registered components", () => {
    let receivedLoading: boolean | undefined;
    const { registry: testRegistry } = defineRegistry(catalog, {
      components: {
        Widget: ({ loading }) => {
          receivedLoading = loading;
          return h("div", null, "widget");
        },
      },
    });
    const spec: Spec = {
      root: "w1",
      elements: { w1: { type: "Widget", props: {} } },
    };
    mountRenderer(spec, testRegistry, { loading: true });
    expect(receivedLoading).toBe(true);
  });
});

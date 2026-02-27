import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick, type Component } from "vue";
import { mount } from "@vue/test-utils";
import type { Spec } from "@json-render/core";
import { StateProvider, useStateStore } from "./composables/state";
import { VisibilityProvider } from "./composables/visibility";
import { ActionProvider } from "./composables/actions";
import { ValidationProvider } from "./composables/validation";
import { useFieldValidation } from "./composables/validation";
import { useBoundProp } from "./hooks";
import {
  Renderer,
  JSONUIProvider,
  type ComponentRegistry,
  type ComponentRenderProps,
} from "./renderer";

// =============================================================================
// Stub components
// =============================================================================

const Button = defineComponent({
  name: "Button",
  props: {
    element: { type: Object, required: true },
    emit: { type: Function, required: true },
    on: { type: Function, required: true },
    bindings: { type: Object, default: undefined },
    loading: { type: Boolean, default: undefined },
  },
  setup(props) {
    return () =>
      h(
        "button",
        { "data-testid": "btn", onClick: () => props.emit("press") },
        String((props.element as any).props?.label ?? ""),
      );
  },
});

const Text = defineComponent({
  name: "Text",
  props: {
    element: { type: Object, required: true },
    emit: { type: Function, required: true },
    on: { type: Function, required: true },
    bindings: { type: Object, default: undefined },
    loading: { type: Boolean, default: undefined },
  },
  setup(props) {
    return () => {
      const value = (props.element as any).props?.text;
      return h(
        "span",
        { "data-testid": "text" },
        value == null
          ? ""
          : typeof value === "string"
            ? value
            : JSON.stringify(value),
      );
    };
  },
});

const Stack = defineComponent({
  name: "Stack",
  props: {
    element: { type: Object, required: true },
    emit: { type: Function, required: true },
    on: { type: Function, required: true },
    bindings: { type: Object, default: undefined },
    loading: { type: Boolean, default: undefined },
  },
  setup(_props, { slots }) {
    return () => h("div", { "data-testid": "stack" }, slots.default?.());
  },
});

const InputField = defineComponent({
  name: "InputField",
  props: {
    element: { type: Object, required: true },
    emit: { type: Function, required: true },
    on: { type: Function, required: true },
    bindings: { type: Object, default: undefined },
    loading: { type: Boolean, default: undefined },
  },
  setup(props) {
    const elProps = (props.element as any).props ?? {};
    const bindingPath = (props.bindings as Record<string, string>)?.value;
    const [boundValue, setBoundValue] = useBoundProp<string>(
      elProps.value as string | undefined,
      bindingPath,
    );

    const hasValidation = !!(bindingPath && elProps.checks?.length);
    const config = hasValidation ? { checks: elProps.checks ?? [] } : undefined;
    const { errors } = useFieldValidation(bindingPath ?? "", config);

    return () =>
      h("div", null, [
        elProps.label ? h("label", null, elProps.label) : null,
        h("input", {
          "data-testid": "input",
          value: boundValue ?? "",
          onInput: (e: Event) =>
            setBoundValue((e.target as HTMLInputElement).value),
        }),
        errors.value.length > 0
          ? h("span", { "data-testid": "input-error" }, errors.value[0])
          : null,
      ]);
  },
});

const Select = defineComponent({
  name: "Select",
  props: {
    element: { type: Object, required: true },
    emit: { type: Function, required: true },
    on: { type: Function, required: true },
    bindings: { type: Object, default: undefined },
    loading: { type: Boolean, default: undefined },
  },
  setup(props) {
    const elProps = (props.element as any).props ?? {};
    const bindingPath = (props.bindings as Record<string, string>)?.value;
    const [boundValue] = useBoundProp<string>(
      elProps.value as string | undefined,
      bindingPath,
    );
    return () => h("span", { "data-testid": "select-value" }, boundValue ?? "");
  },
});

const registry: ComponentRegistry = {
  Button: Button as unknown as Component,
  Text: Text as unknown as Component,
  Input: InputField as unknown as Component,
  Select: Select as unknown as Component,
  Stack: Stack as unknown as Component,
};

// State probe to read state from tests
const StateProbe = defineComponent({
  name: "StateProbe",
  setup() {
    const { state } = useStateStore();
    return () =>
      h("pre", { "data-testid": "state-probe" }, JSON.stringify(state.value));
  },
});

function getState(wrapper: ReturnType<typeof mount>): Record<string, unknown> {
  return JSON.parse(wrapper.find("[data-testid='state-probe']").text());
}

// =============================================================================
// Mount helper
// =============================================================================

function mountWithProviders(
  spec: Spec,
  opts: {
    functions?: Record<string, (args: Record<string, unknown>) => unknown>;
    handlers?: Record<
      string,
      (params: Record<string, unknown>) => Promise<void> | void
    >;
    initialState?: Record<string, unknown>;
  } = {},
) {
  return mount(JSONUIProvider as Component, {
    props: {
      registry,
      initialState: opts.initialState ?? spec.state ?? {},
      functions: opts.functions,
      handlers: opts.handlers,
    } as any,
    slots: {
      default: () => [h(Renderer, { spec, registry }), h(StateProbe)],
    },
  });
}

// =============================================================================
// $computed expressions in rendering
// =============================================================================

describe("$computed expressions in rendering", () => {
  it("resolves a $computed prop using provided functions", () => {
    const spec: Spec = {
      state: { first: "Jane", last: "Doe" },
      root: "main",
      elements: {
        main: {
          type: "Text",
          props: {
            text: {
              $computed: "fullName",
              args: {
                first: { $state: "/first" },
                last: { $state: "/last" },
              },
            },
          },
          children: [],
        },
      },
    };

    const functions = {
      fullName: (args: Record<string, unknown>) => `${args.first} ${args.last}`,
    };

    const wrapper = mountWithProviders(spec, { functions });
    expect(wrapper.find("[data-testid='text']").text()).toBe("Jane Doe");
  });

  it("renders gracefully when functions prop is omitted", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const spec: Spec = {
      state: {},
      root: "main",
      elements: {
        main: {
          type: "Text",
          props: {
            text: { $computed: "missing" },
          },
          children: [],
        },
      },
    };

    const wrapper = mountWithProviders(spec);
    expect(wrapper.find("[data-testid='text']").text()).toBe("");
    warnSpy.mockRestore();
  });
});

// =============================================================================
// Watchers
// =============================================================================

describe("watchers (watch field)", () => {
  it("does not fire on initial render, fires when watched state changes", async () => {
    const loadCities = vi.fn();

    const spec: Spec = {
      state: { form: { country: "" }, citiesLoaded: false },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["btn", "watcher"],
        },
        btn: {
          type: "Button",
          props: { label: "Set Country" },
          on: {
            press: [
              {
                action: "setState",
                params: { statePath: "/form/country", value: "US" },
              },
            ],
          },
          children: [],
        },
        watcher: {
          type: "Select",
          props: { value: { $state: "/form/country" } },
          watch: {
            "/form/country": {
              action: "loadCities",
              params: { country: { $state: "/form/country" } },
            },
          },
          children: [],
        },
      },
    };

    const wrapper = mountWithProviders(spec, { handlers: { loadCities } });

    expect(loadCities).not.toHaveBeenCalled();

    await wrapper.find("[data-testid='btn']").trigger("click");
    await nextTick();
    await nextTick();

    expect(loadCities).toHaveBeenCalledTimes(1);
    expect(loadCities).toHaveBeenCalledWith(
      expect.objectContaining({ country: "US" }),
    );
  });

  it("fires multiple action bindings on the same watch path", async () => {
    const action1 = vi.fn();
    const action2 = vi.fn();

    const spec: Spec = {
      state: { value: "a" },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["btn", "watcher"],
        },
        btn: {
          type: "Button",
          props: { label: "Change" },
          on: {
            press: [
              {
                action: "setState",
                params: { statePath: "/value", value: "b" },
              },
            ],
          },
          children: [],
        },
        watcher: {
          type: "Text",
          props: { text: { $state: "/value" } },
          watch: {
            "/value": [{ action: "action1" }, { action: "action2" }],
          },
          children: [],
        },
      },
    };

    const wrapper = mountWithProviders(spec, {
      handlers: { action1, action2 },
    });

    await wrapper.find("[data-testid='btn']").trigger("click");
    await nextTick();
    await nextTick();

    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// validateForm action
// =============================================================================

describe("validateForm action", () => {
  it("writes { valid: false, errors } when a required field is empty", async () => {
    const spec: Spec = {
      state: { form: { email: "" }, result: null },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["emailInput", "submitBtn"],
        },
        emailInput: {
          type: "Input",
          props: {
            label: "Email",
            value: { $bindState: "/form/email" },
            checks: [{ type: "required", message: "Email is required" }],
          },
          children: [],
        },
        submitBtn: {
          type: "Button",
          props: { label: "Submit" },
          on: {
            press: [
              {
                action: "validateForm",
                params: { statePath: "/result" },
              },
            ],
          },
          children: [],
        },
      },
    };

    const wrapper = mountWithProviders(spec);
    await wrapper.find("[data-testid='btn']").trigger("click");
    await nextTick();

    const state = getState(wrapper);
    expect(state.result).toEqual({
      valid: false,
      errors: { "/form/email": ["Email is required"] },
    });
  });

  it("writes { valid: true, errors: {} } when all fields pass validation", async () => {
    const spec: Spec = {
      state: { form: { email: "test@example.com" }, result: null },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["emailInput", "submitBtn"],
        },
        emailInput: {
          type: "Input",
          props: {
            label: "Email",
            value: { $bindState: "/form/email" },
            checks: [{ type: "required", message: "Email is required" }],
          },
          children: [],
        },
        submitBtn: {
          type: "Button",
          props: { label: "Submit" },
          on: {
            press: [
              {
                action: "validateForm",
                params: { statePath: "/result" },
              },
            ],
          },
          children: [],
        },
      },
    };

    const wrapper = mountWithProviders(spec);
    await wrapper.find("[data-testid='btn']").trigger("click");
    await nextTick();

    const state = getState(wrapper);
    expect(state.result).toEqual({ valid: true, errors: {} });
  });

  it("defaults to /formValidation when no statePath is provided", async () => {
    const spec: Spec = {
      state: { form: { name: "filled" } },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["nameInput", "submitBtn"],
        },
        nameInput: {
          type: "Input",
          props: {
            label: "Name",
            value: { $bindState: "/form/name" },
            checks: [{ type: "required", message: "Required" }],
          },
          children: [],
        },
        submitBtn: {
          type: "Button",
          props: { label: "Submit" },
          on: {
            press: [{ action: "validateForm" }],
          },
          children: [],
        },
      },
    };

    const wrapper = mountWithProviders(spec);
    await wrapper.find("[data-testid='btn']").trigger("click");
    await nextTick();

    const state = getState(wrapper);
    expect(state.formValidation).toEqual({ valid: true, errors: {} });
  });
});

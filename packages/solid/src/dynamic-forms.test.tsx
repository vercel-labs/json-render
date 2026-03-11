import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { defineCatalog, type Spec } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  defineRegistry,
  type ComponentRenderProps,
} from "./renderer";
import type { ComponentFn } from "./catalog-types";
import { useStateStore } from "./contexts/state";
import { useFieldValidation } from "./contexts/validation";
import { useBoundProp } from "./hooks";
import { schema as solidSchema } from "./schema";
import { z } from "zod";

const exampleCatalog = defineCatalog(solidSchema, {
  components: {
    Stack: {
      props: z.object({
        gap: z.number().optional(),
        padding: z.number().optional(),
        direction: z.enum(["vertical", "horizontal"]).optional(),
        align: z.enum(["start", "center", "end"]).optional(),
      }),
      slots: ["default"],
      description:
        "Layout container that stacks children vertically or horizontally",
    },
    Card: {
      props: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
      }),
      slots: ["default"],
      description: "A card container with optional title and subtitle",
    },
    Text: {
      props: z.object({
        content: z.string(),
        size: z.enum(["sm", "md", "lg", "xl"]).optional(),
        weight: z.enum(["normal", "medium", "bold"]).optional(),
        color: z.string().optional(),
      }),
      slots: [],
      description: "Displays a text string",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).optional(),
        disabled: z.boolean().optional(),
      }),
      slots: [],
      description: "A clickable button that emits a 'press' event",
    },
    Badge: {
      props: z.object({
        label: z.string(),
        color: z.string().optional(),
      }),
      slots: [],
      description: "A small badge/tag label",
    },
    ListItem: {
      props: z.object({
        title: z.string(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
      }),
      slots: [],
      description: "A single item in a list",
    },
    RendererTabs: {
      props: z.object({ renderer: z.string() }),
      slots: [],
      description:
        "Segmented tab control for switching between Vue, React, Svelte, and Solid renderers",
    },
    RendererBadge: {
      props: z.object({ renderer: z.string() }),
      slots: [],
      description: "Badge indicating which renderer is currently active",
    },
  },
  actions: {
    increment: {
      params: z.object({}),
      description: "Increment the counter by 1",
    },
    decrement: {
      params: z.object({}),
      description: "Decrement the counter by 1",
    },
    reset: {
      params: z.object({}),
      description: "Reset the counter to 0",
    },
    toggleItem: {
      params: z.object({ index: z.number() }),
      description: "Toggle the completed state of a todo item",
    },
    switchToVue: {
      params: z.object({}),
      description: "Switch to the Vue renderer",
    },
    switchToReact: {
      params: z.object({}),
      description: "Switch to the React renderer",
    },
    switchToSvelte: {
      params: z.object({}),
      description: "Switch to the Svelte renderer",
    },
    switchToSolid: {
      params: z.object({}),
      description: "Switch to the Solid renderer",
    },
  },
});

const definedStack: ComponentFn<typeof exampleCatalog, "Stack"> = (ctx) => (
  <div>{ctx.children}</div>
);

const definedButton: ComponentFn<typeof exampleCatalog, "Button"> = (ctx) => (
  <button data-testid="defined-btn" onClick={() => ctx.emit("press")}>
    {ctx.props.label}
  </button>
);

const definedText: ComponentFn<typeof exampleCatalog, "Text"> = (ctx) => (
  <span data-testid="defined-text">{ctx.props.content}</span>
);

const definedCard: ComponentFn<typeof exampleCatalog, "Card"> = (ctx) => (
  <div>{ctx.children}</div>
);

const definedBadge: ComponentFn<typeof exampleCatalog, "Badge"> = (ctx) => (
  <span>{ctx.props.label}</span>
);

const definedListItem: ComponentFn<typeof exampleCatalog, "ListItem"> = (
  ctx,
) => <div>{ctx.props.title}</div>;

const definedRendererBadge: ComponentFn<
  typeof exampleCatalog,
  "RendererBadge"
> = (ctx) => <span>{ctx.props.renderer}</span>;

const definedRendererTabs: ComponentFn<
  typeof exampleCatalog,
  "RendererTabs"
> = () => <div />;

const exampleComponents = {
  Stack: definedStack,
  Button: definedButton,
  Text: definedText,
  Card: definedCard,
  Badge: definedBadge,
  ListItem: definedListItem,
  RendererBadge: definedRendererBadge,
  RendererTabs: definedRendererTabs,
};

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
    if (v == null) return "";
    return typeof v === "string" ? v : JSON.stringify(v);
  };
  return <span data-testid="text">{display()}</span>;
}

function InputField(
  props: ComponentRenderProps<{
    label?: string;
    value?: string;
    checks?: Array<{
      type: string;
      message: string;
      args?: Record<string, unknown>;
    }>;
  }>,
) {
  const elementProps = () => props.element.props;
  const [boundValue, setBoundValue] = useBoundProp<string>(
    elementProps().value as string | undefined,
    props.bindings?.value,
  );
  const [localValue, setLocalValue] = createSignal("");
  const isBound = () => !!props.bindings?.value;
  const value = () => (isBound() ? (boundValue ?? "") : localValue());
  const setValue = (v: string) =>
    isBound() ? setBoundValue(v) : setLocalValue(v);

  const hasValidation = () =>
    !!(props.bindings?.value && elementProps().checks?.length);
  const config = () =>
    hasValidation() ? { checks: elementProps().checks ?? [] } : undefined;
  const { errors } = useFieldValidation(props.bindings?.value ?? "", config());

  return (
    <div>
      {elementProps().label && <label>{elementProps().label}</label>}
      <input
        data-testid="input"
        value={value()}
        onInput={(e) => setValue(e.currentTarget.value)}
      />
      {errors().length > 0 && (
        <span data-testid="input-error">{errors()[0]}</span>
      )}
    </div>
  );
}

function SelectField(
  props: ComponentRenderProps<{ label?: string; value?: string }>,
) {
  const [boundValue] = useBoundProp<string>(
    props.element.props.value as string | undefined,
    props.bindings?.value,
  );
  return <span data-testid="select-value">{boundValue ?? ""}</span>;
}

function ValidatedSelect(
  props: ComponentRenderProps<{
    label?: string;
    name?: string;
    options?: string[];
    placeholder?: string;
    value?: string;
    checks?: Array<{
      type: string;
      message: string;
      args?: Record<string, unknown>;
    }>;
    validateOn?: "change" | "blur" | "submit";
  }>,
) {
  const elementProps = () => props.element.props;
  const [boundValue, setBoundValue] = useBoundProp<string>(
    elementProps().value as string | undefined,
    props.bindings?.value,
  );
  const [localValue, setLocalValue] = createSignal("");
  const isBound = () => !!props.bindings?.value;
  const value = () => (isBound() ? (boundValue ?? "") : localValue());
  const setValue = (v: string) =>
    isBound() ? setBoundValue(v) : setLocalValue(v);
  const validateOn = () => elementProps().validateOn ?? "change";

  const hasValidation = () =>
    !!(props.bindings?.value && elementProps().checks?.length);
  const config = () =>
    hasValidation()
      ? { checks: elementProps().checks ?? [], validateOn: validateOn() }
      : undefined;
  const { errors, validate } = useFieldValidation(
    props.bindings?.value ?? "",
    config(),
  );

  const options = () => elementProps().options ?? [];
  const name = () => elementProps().name ?? "default";

  return (
    <div>
      {elementProps().label && <label>{elementProps().label}</label>}
      <select
        data-testid={`select-${name()}`}
        value={value()}
        onChange={(e) => {
          setValue(e.currentTarget.value);
          if (hasValidation() && validateOn() === "change") validate();
          props.emit("change");
        }}
      >
        <option value="">{elementProps().placeholder ?? "Select..."}</option>
        {options().map((opt) => (
          <option value={opt}>{opt}</option>
        ))}
      </select>
      {errors().length > 0 && (
        <span data-testid={`select-error-${name()}`}>{errors()[0]}</span>
      )}
    </div>
  );
}

function Stack(props: ComponentRenderProps<Record<string, unknown>>) {
  return <div data-testid="stack">{props.children}</div>;
}

let probeGetSnapshot: (() => Record<string, unknown>) | undefined;

function StateProbe() {
  const ctx = useStateStore();
  probeGetSnapshot = ctx.getSnapshot;
  return <div data-testid="state-probe" />;
}

const registry = { Button, Text, Input: InputField, Select: SelectField };

function getState(): Record<string, unknown> {
  return probeGetSnapshot!();
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

    render(() => (
      <JSONUIProvider
        registry={registry}
        initialState={spec.state}
        functions={functions}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));

    expect(screen.getByTestId("text").textContent).toBe("Jane Doe");
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

    render(() => (
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));

    expect(screen.getByTestId("text").textContent).toBe("");
    warnSpy.mockRestore();
  });
});

// =============================================================================
// $template expressions in rendering
// =============================================================================

describe("$template expressions in rendering", () => {
  it("interpolates state values into a template string", () => {
    const spec: Spec = {
      state: { user: { name: "Alice" }, count: 3 },
      root: "main",
      elements: {
        main: {
          type: "Text",
          props: {
            text: {
              $template: "Hello, ${/user/name}! You have ${/count} messages.",
            },
          },
          children: [],
        },
      },
    };

    render(() => (
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));

    expect(screen.getByTestId("text").textContent).toBe(
      "Hello, Alice! You have 3 messages.",
    );
  });

  it("resolves missing paths to empty string", () => {
    const spec: Spec = {
      state: {},
      root: "main",
      elements: {
        main: {
          type: "Text",
          props: {
            text: { $template: "Hi ${/name}!" },
          },
          children: [],
        },
      },
    };

    render(() => (
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));

    expect(screen.getByTestId("text").textContent).toBe("Hi !");
  });
});

// =============================================================================
// Watchers
// =============================================================================

describe("watchers (watch field)", () => {
  it("does not fire on initial render, fires when watched state changes", async () => {
    probeGetSnapshot = undefined;
    const loadCities = vi.fn(async (_params: Record<string, unknown>) => {});

    const reg = { ...registry, Stack };

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

    render(() => (
      <JSONUIProvider
        registry={reg}
        initialState={spec.state}
        handlers={{ loadCities }}
      >
        <Renderer spec={spec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>
    ));

    expect(loadCities).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      expect(loadCities).toHaveBeenCalledTimes(1);
    });
    expect(loadCities).toHaveBeenCalledWith(
      expect.objectContaining({ country: "US" }),
    );
  });

  it("fires multiple action bindings on the same watch path", async () => {
    probeGetSnapshot = undefined;
    const action1 = vi.fn();
    const action2 = vi.fn();

    const reg = { ...registry, Stack };

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

    render(() => (
      <JSONUIProvider
        registry={reg}
        initialState={spec.state}
        handlers={{ action1, action2 }}
      >
        <Renderer spec={spec} registry={reg} />
      </JSONUIProvider>
    ));

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      expect(action1).toHaveBeenCalledTimes(1);
      expect(action2).toHaveBeenCalledTimes(1);
    });
  });
});

describe("defineRegistry reactivity", () => {
  it("updates $state-backed props after setState actions", async () => {
    const { registry: definedRegistry } = defineRegistry(exampleCatalog, {
      components: exampleComponents,
      actions: {
        increment: async () => {},
        decrement: async () => {},
        reset: async () => {},
        toggleItem: async () => {},
        switchToVue: async () => {},
        switchToReact: async () => {},
        switchToSvelte: async () => {},
        switchToSolid: async () => {},
      },
    });

    const spec: Spec = {
      state: { value: "a" },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["btn", "text"],
        },
        btn: {
          type: "Button",
          props: { label: "Change" },
          on: {
            press: {
              action: "setState",
              params: { statePath: "/value", value: "b" },
            },
          },
          children: [],
        },
        text: {
          type: "Text",
          props: { content: { $state: "/value" } },
          children: [],
        },
      },
    };

    render(() => (
      <JSONUIProvider registry={definedRegistry} initialState={spec.state}>
        <Renderer spec={spec} registry={definedRegistry} />
      </JSONUIProvider>
    ));

    expect(screen.getByTestId("defined-text").textContent).toBe("a");

    fireEvent.click(screen.getByTestId("defined-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("defined-text").textContent).toBe("b");
    });
  });
});

// =============================================================================
// validateForm action
// =============================================================================

describe("validateForm action", () => {
  it("writes { valid: false } when a required field is empty", async () => {
    probeGetSnapshot = undefined;
    const reg = { ...registry, Stack };

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

    render(() => (
      <JSONUIProvider registry={reg} initialState={spec.state}>
        <Renderer spec={spec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>
    ));

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      const state = getState();
      expect(state.result).toEqual({
        valid: false,
        errors: { "/form/email": ["Email is required"] },
      });
    });
  });

  it("writes { valid: true } when all fields pass validation", async () => {
    probeGetSnapshot = undefined;
    const reg = { ...registry, Stack };

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

    render(() => (
      <JSONUIProvider registry={reg} initialState={spec.state}>
        <Renderer spec={spec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>
    ));

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      const state = getState();
      expect(state.result).toEqual({ valid: true, errors: {} });
    });
  });

  it("defaults to /formValidation when no statePath is provided", async () => {
    probeGetSnapshot = undefined;
    const reg = { ...registry, Stack };

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

    render(() => (
      <JSONUIProvider registry={reg} initialState={spec.state}>
        <Renderer spec={spec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>
    ));

    fireEvent.click(screen.getByTestId("btn"));

    await waitFor(() => {
      const state = getState();
      expect(state.formValidation).toEqual({ valid: true, errors: {} });
    });
  });
});

// =============================================================================
// Select validate-on-change timing (#151)
// =============================================================================

describe("Select validate-on-change sees the new value, not the stale value", () => {
  const regWithSelect = {
    ...registry,
    Stack,
    Select: ValidatedSelect,
  };

  it("does not show 'required' error when selecting the first value", async () => {
    probeGetSnapshot = undefined;
    const spec: Spec = {
      state: { form: { country: "" } },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["countrySelect"],
        },
        countrySelect: {
          type: "Select",
          props: {
            label: "Country",
            name: "country",
            options: ["US", "Canada", "UK"],
            placeholder: "Choose a country",
            value: { $bindState: "/form/country" },
            checks: [{ type: "required", message: "Country is required" }],
            validateOn: "change",
          },
          children: [],
        },
      },
    };

    render(() => (
      <JSONUIProvider registry={regWithSelect} initialState={spec.state}>
        <Renderer spec={spec} registry={regWithSelect} />
        <StateProbe />
      </JSONUIProvider>
    ));

    fireEvent.change(screen.getByTestId("select-country"), {
      target: { value: "US" },
    });

    await waitFor(() => {
      const state = getState();
      expect((state.form as Record<string, unknown>).country).toBe("US");
    });

    expect(screen.queryByTestId("select-error-country")).toBeNull();
  });

  it("does not show 'required' error when selecting the first city after country change resets it", async () => {
    probeGetSnapshot = undefined;
    const spec: Spec = {
      state: {
        form: { country: "US", city: "" },
        availableCities: ["New York", "Chicago"],
      },
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {},
          children: ["citySelect"],
        },
        citySelect: {
          type: "Select",
          props: {
            label: "City",
            name: "city",
            options: ["New York", "Chicago"],
            placeholder: "Select a city",
            value: { $bindState: "/form/city" },
            checks: [{ type: "required", message: "City is required" }],
            validateOn: "change",
          },
          children: [],
        },
      },
    };

    render(() => (
      <JSONUIProvider registry={regWithSelect} initialState={spec.state}>
        <Renderer spec={spec} registry={regWithSelect} />
        <StateProbe />
      </JSONUIProvider>
    ));

    fireEvent.change(screen.getByTestId("select-city"), {
      target: { value: "New York" },
    });

    await waitFor(() => {
      const state = getState();
      expect((state.form as Record<string, unknown>).city).toBe("New York");
    });

    expect(screen.queryByTestId("select-error-city")).toBeNull();
  });
});

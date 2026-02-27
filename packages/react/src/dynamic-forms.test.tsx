import { describe, it, expect, vi } from "vitest";
import React, { useState, useCallback, useMemo } from "react";
import { render, act, fireEvent, screen } from "@testing-library/react";
import type { Spec } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRenderProps,
} from "./renderer";
import { useStateStore } from "./contexts/state";
import { useFieldValidation } from "./contexts/validation";
import { useBoundProp } from "./hooks";

// =============================================================================
// Stub components
// =============================================================================

function Button({ element, emit }: ComponentRenderProps<{ label: string }>) {
  return (
    <button data-testid="btn" onClick={() => emit("press")}>
      {element.props.label}
    </button>
  );
}

function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
  const value = element.props.text;
  return (
    <span data-testid="text">
      {value == null
        ? ""
        : typeof value === "string"
          ? value
          : JSON.stringify(value)}
    </span>
  );
}

function InputField({
  element,
  bindings,
}: ComponentRenderProps<{
  label?: string;
  value?: string;
  checks?: Array<{
    type: string;
    message: string;
    args?: Record<string, unknown>;
  }>;
}>) {
  const props = element.props;
  const [boundValue, setBoundValue] = useBoundProp<string>(
    props.value as string | undefined,
    bindings?.value,
  );
  const [localValue, setLocalValue] = useState("");
  const isBound = !!bindings?.value;
  const value = isBound ? (boundValue ?? "") : localValue;
  const setValue = isBound ? setBoundValue : setLocalValue;

  const hasValidation = !!(bindings?.value && props.checks?.length);
  const config = useMemo(
    () => (hasValidation ? { checks: props.checks ?? [] } : undefined),
    [hasValidation, props.checks],
  );
  const { errors } = useFieldValidation(bindings?.value ?? "", config);

  return (
    <div>
      {props.label && <label>{props.label}</label>}
      <input
        data-testid="input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {errors.length > 0 && <span data-testid="input-error">{errors[0]}</span>}
    </div>
  );
}

function SelectField({
  element,
  bindings,
}: ComponentRenderProps<{ label?: string; value?: string }>) {
  const props = element.props;
  const [boundValue] = useBoundProp<string>(
    props.value as string | undefined,
    bindings?.value,
  );
  return <span data-testid="select-value">{boundValue ?? ""}</span>;
}

/**
 * Select stub that mirrors the real shadcn Select validation behavior:
 * calls setValue then validate() synchronously in onValueChange.
 */
function ValidatedSelect({
  element,
  bindings,
  emit,
}: ComponentRenderProps<{
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
}>) {
  const props = element.props;
  const [boundValue, setBoundValue] = useBoundProp<string>(
    props.value as string | undefined,
    bindings?.value,
  );
  const [localValue, setLocalValue] = useState("");
  const isBound = !!bindings?.value;
  const value = isBound ? (boundValue ?? "") : localValue;
  const setValue = isBound ? setBoundValue : setLocalValue;
  const validateOn = props.validateOn ?? "change";

  const hasValidation = !!(bindings?.value && props.checks?.length);
  const config = useMemo(
    () =>
      hasValidation ? { checks: props.checks ?? [], validateOn } : undefined,
    [hasValidation, props.checks, validateOn],
  );
  const { errors, validate } = useFieldValidation(
    bindings?.value ?? "",
    config,
  );

  const options = props.options ?? [];

  return (
    <div>
      {props.label && <label>{props.label}</label>}
      <select
        data-testid={`select-${props.name ?? "default"}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (hasValidation && validateOn === "change") validate();
          emit("change");
        }}
      >
        <option value="">{props.placeholder ?? "Select..."}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {errors.length > 0 && (
        <span data-testid={`select-error-${props.name ?? "default"}`}>
          {errors[0]}
        </span>
      )}
    </div>
  );
}

function StateProbe() {
  const { state } = useStateStore();
  return <pre data-testid="state-probe">{JSON.stringify(state)}</pre>;
}

const registry = { Button, Text, Input: InputField, Select: SelectField };

function getState(): Record<string, unknown> {
  return JSON.parse(screen.getByTestId("state-probe").textContent!);
}

// =============================================================================
// $computed expressions in rendering
// =============================================================================

describe("$computed expressions in rendering", () => {
  it("resolves a $computed prop using provided functions", async () => {
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

    render(
      <JSONUIProvider
        registry={registry}
        initialState={spec.state}
        functions={functions}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );

    expect(screen.getByTestId("text").textContent).toBe("Jane Doe");
  });

  it("renders gracefully when functions prop is omitted", async () => {
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

    render(
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );

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

    render(
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );

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

    render(
      <JSONUIProvider registry={registry} initialState={spec.state}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );

    expect(screen.getByTestId("text").textContent).toBe("Hi !");
  });
});

// =============================================================================
// Watchers
// =============================================================================

describe("watchers (watch field)", () => {
  it("does not fire on initial render, fires when watched state changes", async () => {
    const loadCities = vi.fn(async (params: Record<string, unknown>) => {
      // no-op, just tracking the call
    });

    const spec: Spec = {
      state: { form: { country: "" }, citiesLoaded: false },
      root: "main",
      elements: {
        main: {
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

    // Add watcher as a child of a wrapper so both render
    const wrapperSpec: Spec = {
      ...spec,
      root: "wrapper",
      elements: {
        ...spec.elements,
        wrapper: {
          type: "Button",
          props: { label: "wrapper" },
          children: ["main", "watcher"],
        },
      },
    };

    // Use a Stack-like wrapper -- but since we only have Button/Text/Select
    // stubs, we need a container. Let's add a simple Stack stub.
    const Stack = ({
      children,
    }: ComponentRenderProps<Record<string, unknown>>) => {
      return <div data-testid="stack">{children}</div>;
    };
    const reg = { ...registry, Stack };

    const stackSpec: Spec = {
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

    render(
      <JSONUIProvider
        registry={reg}
        initialState={stackSpec.state}
        handlers={{ loadCities }}
      >
        <Renderer spec={stackSpec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>,
    );

    // Not called on initial render
    expect(loadCities).not.toHaveBeenCalled();

    // Change the watched state path
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    expect(loadCities).toHaveBeenCalledTimes(1);
    expect(loadCities).toHaveBeenCalledWith(
      expect.objectContaining({ country: "US" }),
    );
  });

  it("fires multiple action bindings on the same watch path", async () => {
    const action1 = vi.fn();
    const action2 = vi.fn();

    const Stack = ({
      children,
    }: ComponentRenderProps<Record<string, unknown>>) => <div>{children}</div>;
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

    render(
      <JSONUIProvider
        registry={reg}
        initialState={spec.state}
        handlers={{ action1, action2 }}
      >
        <Renderer spec={spec} registry={reg} />
      </JSONUIProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// validateForm action
// =============================================================================

describe("validateForm action", () => {
  it("writes { valid: false } when a required field is empty", async () => {
    const Stack = ({
      children,
    }: ComponentRenderProps<Record<string, unknown>>) => <div>{children}</div>;
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

    render(
      <JSONUIProvider registry={reg} initialState={spec.state}>
        <Renderer spec={spec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>,
    );

    // Click submit with empty email
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    const state = getState();
    expect(state.result).toEqual({
      valid: false,
      errors: { "/form/email": ["Email is required"] },
    });
  });

  it("writes { valid: true } when all fields pass validation", async () => {
    const Stack = ({
      children,
    }: ComponentRenderProps<Record<string, unknown>>) => <div>{children}</div>;
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

    render(
      <JSONUIProvider registry={reg} initialState={spec.state}>
        <Renderer spec={spec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    const state = getState();
    expect(state.result).toEqual({ valid: true, errors: {} });
  });

  it("defaults to /formValidation when no statePath is provided", async () => {
    const Stack = ({
      children,
    }: ComponentRenderProps<Record<string, unknown>>) => <div>{children}</div>;
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

    render(
      <JSONUIProvider registry={reg} initialState={spec.state}>
        <Renderer spec={spec} registry={reg} />
        <StateProbe />
      </JSONUIProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn"));
    });

    const state = getState();
    expect(state.formValidation).toEqual({ valid: true, errors: {} });
  });
});

// =============================================================================
// Select validate-on-change timing (#151)
// =============================================================================

describe("Select validate-on-change sees the new value, not the stale value", () => {
  const Stack = ({
    children,
  }: ComponentRenderProps<Record<string, unknown>>) => <div>{children}</div>;

  const regWithSelect = {
    ...registry,
    Stack,
    Select: ValidatedSelect,
  };

  it("does not show 'required' error when selecting the first value", async () => {
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

    render(
      <JSONUIProvider registry={regWithSelect} initialState={spec.state}>
        <Renderer spec={spec} registry={regWithSelect} />
        <StateProbe />
      </JSONUIProvider>,
    );

    // Select "US" for the first time (from empty)
    await act(async () => {
      fireEvent.change(screen.getByTestId("select-country"), {
        target: { value: "US" },
      });
    });

    // The value should be set in state
    const state = getState();
    expect((state.form as Record<string, unknown>).country).toBe("US");

    // No validation error should appear -- "US" is non-empty
    expect(screen.queryByTestId("select-error-country")).toBeNull();
  });

  it("does not show 'required' error when selecting the first city after country change resets it", async () => {
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

    render(
      <JSONUIProvider registry={regWithSelect} initialState={spec.state}>
        <Renderer spec={spec} registry={regWithSelect} />
        <StateProbe />
      </JSONUIProvider>,
    );

    // Select "New York" for the first time (from empty)
    await act(async () => {
      fireEvent.change(screen.getByTestId("select-city"), {
        target: { value: "New York" },
      });
    });

    const state = getState();
    expect((state.form as Record<string, unknown>).city).toBe("New York");

    // No validation error should appear
    expect(screen.queryByTestId("select-error-city")).toBeNull();
  });
});

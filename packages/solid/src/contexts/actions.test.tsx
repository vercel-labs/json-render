import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { StateProvider, useStateStore } from "./state";
import {
  ValidationProvider,
  useValidation,
  useFieldValidation,
} from "./validation";
import { ActionProvider, useActions, useAction } from "./actions";

/**
 * Build the full provider tree inline so that Solid's eager JSX evaluation
 * always runs ActionProvider/ValidationProvider INSIDE StateProvider's scope.
 *
 * IMPORTANT: Do NOT pre-build JSX fragments as variables — Solid evaluates
 * JSX eagerly, so `<ActionProvider>` would call `useStateStore()` before the
 * StateProvider context is available.
 */
function withProviders<T>(
  hook: () => T,
  options: {
    handlers?: Record<
      string,
      (params: Record<string, unknown>) => Promise<void> | void
    >;
    initialState?: Record<string, unknown>;
    withValidation?: boolean;
  } = {},
): T {
  let result!: T;
  function TestComponent(): JSX.Element {
    result = hook();
    return (<div />) as JSX.Element;
  }

  if (options.withValidation) {
    render(() => (
      <StateProvider initialState={options.initialState ?? {}}>
        <ValidationProvider>
          <ActionProvider handlers={options.handlers}>
            <TestComponent />
          </ActionProvider>
        </ValidationProvider>
      </StateProvider>
    ));
  } else {
    render(() => (
      <StateProvider initialState={options.initialState ?? {}}>
        <ActionProvider handlers={options.handlers}>
          <TestComponent />
        </ActionProvider>
      </StateProvider>
    ));
  }
  return result;
}

function withFullProviders(options: {
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<void> | void
  >;
  initialState?: Record<string, unknown>;
  withValidation?: boolean;
}): {
  stateCtx: ReturnType<typeof useStateStore>;
  actionsCtx: ReturnType<typeof useActions>;
  validationCtx?: ReturnType<typeof useValidation>;
} {
  let stateCtx!: ReturnType<typeof useStateStore>;
  let actionsCtx!: ReturnType<typeof useActions>;
  let validationCtx: ReturnType<typeof useValidation> | undefined;
  function TestComponent(): JSX.Element {
    stateCtx = useStateStore();
    actionsCtx = useActions();
    if (options.withValidation) {
      validationCtx = useValidation();
    }
    return (<div />) as JSX.Element;
  }

  if (options.withValidation) {
    render(() => (
      <StateProvider initialState={options.initialState ?? {}}>
        <ValidationProvider>
          <ActionProvider handlers={options.handlers}>
            <TestComponent />
          </ActionProvider>
        </ValidationProvider>
      </StateProvider>
    ));
  } else {
    render(() => (
      <StateProvider initialState={options.initialState ?? {}}>
        <ActionProvider handlers={options.handlers}>
          <TestComponent />
        </ActionProvider>
      </StateProvider>
    ));
  }
  return { stateCtx, actionsCtx, validationCtx };
}

describe("ActionProvider — provide/inject", () => {
  it("useActions() throws outside a provider", () => {
    expect(() => useActions()).toThrow(
      "useActions must be used within an ActionProvider",
    );
  });
});

describe("ActionProvider — built-in setState", () => {
  it("executes setState and updates state", async () => {
    const { stateCtx, actionsCtx } = withFullProviders({
      initialState: { count: 0 },
    });

    await actionsCtx.execute({
      action: "setState",
      params: { statePath: "/count", value: 5 },
    });

    expect(stateCtx.get("/count")).toBe(5);
  });
});

describe("ActionProvider — built-in pushState", () => {
  it("appends to existing array", async () => {
    const { stateCtx, actionsCtx } = withFullProviders({
      initialState: { items: ["a", "b"] },
    });

    await actionsCtx.execute({
      action: "pushState",
      params: { statePath: "/items", value: "c" },
    });

    expect(stateCtx.get("/items")).toEqual(["a", "b", "c"]);
  });

  it("creates array if path does not exist", async () => {
    const { stateCtx, actionsCtx } = withFullProviders({
      initialState: {},
    });

    await actionsCtx.execute({
      action: "pushState",
      params: { statePath: "/newList", value: "first" },
    });

    expect(stateCtx.get("/newList")).toEqual(["first"]);
  });
});

describe("ActionProvider — built-in removeState", () => {
  it("removes item by index", async () => {
    const { stateCtx, actionsCtx } = withFullProviders({
      initialState: { items: ["a", "b", "c"] },
    });

    await actionsCtx.execute({
      action: "removeState",
      params: { statePath: "/items", index: 1 },
    });

    expect(stateCtx.get("/items")).toEqual(["a", "c"]);
  });
});

describe("ActionProvider — built-in push/pop navigation", () => {
  it("push sets /currentScreen and /navStack", async () => {
    const { stateCtx, actionsCtx } = withFullProviders({
      initialState: { currentScreen: "home" },
    });

    await actionsCtx.execute({
      action: "push",
      params: { screen: "settings" },
    });

    expect(stateCtx.get("/currentScreen")).toBe("settings");
    expect(stateCtx.get("/navStack")).toEqual(["home"]);
  });

  it("pop restores previous screen from /navStack", async () => {
    const { stateCtx, actionsCtx } = withFullProviders({
      initialState: { currentScreen: "settings", navStack: ["home"] },
    });

    await actionsCtx.execute({ action: "pop" });

    expect(stateCtx.get("/currentScreen")).toBe("home");
    expect(stateCtx.get("/navStack")).toEqual([]);
  });
});

describe("ActionProvider — custom handlers", () => {
  it("executes custom handler with params", async () => {
    const customHandler = vi.fn().mockResolvedValue(undefined);
    const { actionsCtx } = withFullProviders({
      handlers: { myAction: customHandler },
    });

    await actionsCtx.execute({
      action: "myAction",
      params: { foo: "bar" },
    });

    expect(customHandler).toHaveBeenCalledWith({ foo: "bar" });
  });

  it("console.warn for unknown action", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { actionsCtx } = withFullProviders({});

    await actionsCtx.execute({ action: "unknownAction" });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unknownAction"),
    );
    warnSpy.mockRestore();
  });

  it("tracks loading state during async action execution", async () => {
    let resolveHandler!: () => void;
    const slowHandler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveHandler = resolve;
        }),
    );

    let executeFn!: ReturnType<typeof useActions>["execute"];

    const { findByTestId } = render(() => {
      function Inner(): JSX.Element {
        const actions = useActions();
        executeFn = actions.execute;
        return (
          <span data-testid="loading">
            {actions.loadingActions.has("slowAction") ? "true" : "false"}
          </span>
        );
      }
      return (
        <StateProvider initialState={{}}>
          <ActionProvider handlers={{ slowAction: slowHandler }}>
            <Inner />
          </ActionProvider>
        </StateProvider>
      );
    });

    // Before execution — not loading
    const el = await findByTestId("loading");
    expect(el.textContent).toBe("false");

    const executePromise = executeFn({ action: "slowAction" });

    // During execution — loading (need to wait for Solid's reactivity to flush)
    await vi.waitFor(() => {
      expect(el.textContent).toBe("true");
    });

    resolveHandler();
    await executePromise;

    // After execution — no longer loading
    await vi.waitFor(() => {
      expect(el.textContent).toBe("false");
    });
  });

  it("registerHandler allows dynamic handler registration", async () => {
    const dynamicHandler = vi.fn().mockResolvedValue(undefined);
    const { actionsCtx } = withFullProviders({});

    actionsCtx.registerHandler("dynamicAction", dynamicHandler);
    await actionsCtx.execute({
      action: "dynamicAction",
      params: { x: 1 },
    });

    expect(dynamicHandler).toHaveBeenCalledWith({ x: 1 });
  });

  it("handler receives resolved params object", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { actionsCtx } = withFullProviders({
      handlers: { myAction: handler },
    });

    await actionsCtx.execute({
      action: "myAction",
      params: { x: 1, y: "hello" },
    });

    expect(handler).toHaveBeenCalledWith({ x: 1, y: "hello" });
  });
});

describe("ActionProvider — validateForm", () => {
  it("writes { valid, errors } to state", async () => {
    const { stateCtx, actionsCtx, validationCtx } = withFullProviders({
      initialState: {},
      withValidation: true,
    });

    validationCtx!.registerField("/form/email", {
      checks: [{ type: "required", message: "Required" }],
    });

    await actionsCtx.execute({ action: "validateForm" });

    expect(stateCtx.get("/formValidation")).toEqual({
      valid: false,
      errors: { "/form/email": ["Required"] },
    });
  });

  it("warns without ValidationProvider", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { actionsCtx } = withFullProviders({
      withValidation: false,
    });

    await actionsCtx.execute({ action: "validateForm" });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("validateForm action was dispatched"),
    );
    warnSpy.mockRestore();
  });
});

describe("useAction", () => {
  it("returns { execute, isLoading: false } before execution", () => {
    const result = withProviders(() => useAction({ action: "myAction" }), {
      handlers: { myAction: vi.fn() },
    });

    expect(typeof result.execute).toBe("function");
    expect(result.isLoading).toBe(false);
  });
});

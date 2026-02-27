import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, type Component } from "vue";
import { mount } from "@vue/test-utils";
import { StateProvider, useStateStore } from "./state";
import { ActionProvider, useActions, useAction } from "./actions";

/** Mount StateProvider → ActionProvider with a child that captures context. */
function withProviders<T>(
  composable: () => T,
  handlers: Record<
    string,
    (params: Record<string, unknown>) => Promise<void>
  > = {},
  initialState: Record<string, unknown> = {},
): { result: T } {
  let result!: T;
  const Child = defineComponent({
    setup() {
      result = composable();
      return () => h("div");
    },
  });
  mount(StateProvider as Component, {
    props: { initialState } as any,
    slots: {
      default: () =>
        h(ActionProvider as Component, { handlers } as any, {
          default: () => h(Child),
        }),
    },
  });
  return { result };
}

describe("ActionProvider — provide/inject", () => {
  it("useActions() throws outside a provider", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => useActions()).toThrow(
      "useActions must be used within an ActionProvider",
    );
    warn.mockRestore();
  });
});

describe("ActionProvider — custom handler dispatch", () => {
  it("calling execute invokes the registered handler", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { result } = withProviders(() => useActions(), { myAction: handler });
    await result.execute({ action: "myAction", params: { x: 1 } });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("handler receives the resolved params", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { result } = withProviders(() => useActions(), { myAction: handler });
    await result.execute({ action: "myAction", params: { x: 1, y: "hello" } });
    expect(handler).toHaveBeenCalledWith({ x: 1, y: "hello" });
  });

  it("console.warn is called for unknown actions", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = withProviders(() => useActions());
    await result.execute({ action: "unknownAction" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unknownAction"));
    warn.mockRestore();
  });
});

describe("ActionProvider — built-in setState integration", () => {
  it("executing setState updates state via the provider chain", async () => {
    let stateCtx!: ReturnType<typeof useStateStore>;
    let actionsCtx!: ReturnType<typeof useActions>;

    const Child = defineComponent({
      setup() {
        stateCtx = useStateStore();
        actionsCtx = useActions();
        return () => h("div");
      },
    });

    mount(StateProvider as Component, {
      props: { initialState: { v: 0 } } as any,
      slots: {
        default: () =>
          h(ActionProvider as Component, null, {
            default: () => h(Child),
          }),
      },
    });

    await actionsCtx.execute({
      action: "setState",
      params: { statePath: "/v", value: 42 },
    });
    expect(stateCtx.state.value).toEqual({ v: 42 });
  });
});

describe("useAction", () => {
  it("returns { execute, isLoading: false } before execution", () => {
    const { result } = withProviders(() => useAction({ action: "myAction" }));
    expect(typeof result.execute).toBe("function");
    expect(result.isLoading.value).toBe(false);
  });
});

import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, type Component, type ComputedRef } from "vue";
import { mount } from "@vue/test-utils";
import { StateProvider, useStateStore } from "./state";
import { VisibilityProvider, useVisibility, useIsVisible } from "./visibility";

/** Mount StateProvider → VisibilityProvider with a child that captures context. */
function withProviders<T>(
  composable: () => T,
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
        h(VisibilityProvider as Component, null, {
          default: () => h(Child),
        }),
    },
  });
  return { result };
}

describe("VisibilityProvider — provide/inject", () => {
  it("useVisibility() throws outside a VisibilityProvider", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => useVisibility()).toThrow(
      "useVisibility must be used within a VisibilityProvider",
    );
    warn.mockRestore();
  });

  it("useVisibility() returns a context with isVisible and ctx", () => {
    const { result } = withProviders(() => useVisibility());
    expect(typeof result.isVisible).toBe("function");
    expect(result.ctx).toBeDefined();
    expect(result.ctx.value).toBeDefined();
  });
});

describe("useIsVisible — state integration", () => {
  it("undefined condition returns true", () => {
    const { result } = withProviders(() => useVisibility());
    expect(result.isVisible(undefined)).toBe(true);
  });

  it("{ $state: '/flag' } returns true when state flag is truthy", () => {
    const { result } = withProviders(() => useVisibility(), { flag: true });
    expect(result.isVisible({ $state: "/flag" })).toBe(true);
  });

  it("{ $state: '/flag' } returns false when state flag is falsy", () => {
    const { result } = withProviders(() => useVisibility(), { flag: false });
    expect(result.isVisible({ $state: "/flag" })).toBe(false);
  });

  it("ctx is a ComputedRef whose .value reflects current state", () => {
    const { result } = withProviders(() => useVisibility(), { count: 3 });
    expect(result.ctx.value.stateModel).toEqual({ count: 3 });
  });
});

describe("useIsVisible — reactivity", () => {
  it("returns a ComputedRef<boolean> that updates when state changes", () => {
    let storeCtx!: ReturnType<typeof useStateStore>;
    let isVisible!: ComputedRef<boolean>;

    const Child = defineComponent({
      setup() {
        storeCtx = useStateStore();
        isVisible = useIsVisible({ $state: "/flag" });
        return () => h("div");
      },
    });

    mount(StateProvider as Component, {
      props: { initialState: { flag: false } } as any,
      slots: {
        default: () =>
          h(VisibilityProvider as Component, null, {
            default: () => h(Child),
          }),
      },
    });

    expect(isVisible.value).toBe(false);
    storeCtx.set("/flag", true);
    expect(isVisible.value).toBe(true);
  });
});

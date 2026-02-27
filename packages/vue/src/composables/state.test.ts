import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, type Component } from "vue";
import { mount } from "@vue/test-utils";
import { createStateStore } from "@json-render/core";
import { StateProvider, useStateStore } from "./state";

/** Mount a StateProvider with a child that captures the injected context. */
function withProvider<T>(
  composable: () => T,
  props: Record<string, unknown> = {},
): { result: T } {
  let result!: T;
  const Child = defineComponent({
    setup() {
      result = composable();
      return () => h("div");
    },
  });
  mount(StateProvider as Component, {
    props: props as any,
    slots: { default: () => h(Child) },
  });
  return { result };
}

describe("StateProvider — provide/inject", () => {
  it("useStateStore() throws outside a provider", () => {
    // inject() returns undefined outside of component setup; our guard throws
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => useStateStore()).toThrow(
      "useStateStore must be used within a StateProvider",
    );
    warn.mockRestore();
  });

  it("child receives the context from StateProvider", () => {
    const { result } = withProvider(() => useStateStore());
    expect(result).toBeDefined();
    expect(result.state).toBeDefined();
    expect(typeof result.get).toBe("function");
    expect(typeof result.set).toBe("function");
    expect(typeof result.update).toBe("function");
  });

  it("state.value is a plain object (not a wrapper type)", () => {
    const { result } = withProvider(() => useStateStore(), {
      initialState: { x: 1 },
    });
    expect(result.state.value).toEqual({ x: 1 });
    // Should be a plain object, not a Vue Proxy of a ShallowRef wrapper
    expect(typeof result.state.value).toBe("object");
  });
});

describe("StateProvider (uncontrolled) — reactivity", () => {
  it("state.value reflects initialState on mount", () => {
    const { result } = withProvider(() => useStateStore(), {
      initialState: { count: 5 },
    });
    expect(result.state.value).toEqual({ count: 5 });
  });

  it("after set(), state.value is updated synchronously", () => {
    const { result } = withProvider(() => useStateStore(), {
      initialState: { x: 0 },
    });
    result.set("/x", 42);
    expect(result.state.value).toEqual({ x: 42 });
  });

  it("after update(), all paths are reflected in state.value", () => {
    const { result } = withProvider(() => useStateStore(), {
      initialState: {},
    });
    result.update({ "/a": 1, "/b": "hello" });
    expect(result.state.value).toEqual({ a: 1, b: "hello" });
  });

  it("onStateChange is fired with the changes array on set", () => {
    const onChange = vi.fn();
    const { result } = withProvider(() => useStateStore(), {
      initialState: {},
      onStateChange: onChange,
    });
    result.set("/name", "Alice");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([{ path: "/name", value: "Alice" }]);
  });

  it("onStateChange is fired once with all changed entries on update", () => {
    const onChange = vi.fn();
    const { result } = withProvider(() => useStateStore(), {
      initialState: {},
      onStateChange: onChange,
    });
    result.update({ "/a": 1, "/b": 2 });
    expect(onChange).toHaveBeenCalledOnce();
    const [changes] = onChange.mock.calls[0]!;
    expect(changes).toEqual(
      expect.arrayContaining([
        { path: "/a", value: 1 },
        { path: "/b", value: 2 },
      ]),
    );
  });
});

describe("StateProvider (controlled mode)", () => {
  it("state.value reads from the external store snapshot", () => {
    const store = createStateStore({ x: 10 });
    const { result } = withProvider(() => useStateStore(), { store });
    expect(result.state.value).toEqual({ x: 10 });
  });

  it("set() writes through to the external store", () => {
    const store = createStateStore({ x: 0 });
    const { result } = withProvider(() => useStateStore(), { store });
    result.set("/x", 99);
    expect(store.getSnapshot()).toEqual({ x: 99 });
  });

  it("external store mutation triggers state.value update", () => {
    const store = createStateStore({ x: 0 });
    const { result } = withProvider(() => useStateStore(), { store });
    store.set("/x", 99);
    expect(result.state.value).toEqual({ x: 99 });
  });

  it("onStateChange is NOT called in controlled mode", () => {
    const store = createStateStore({ x: 0 });
    const onChange = vi.fn();
    const { result } = withProvider(() => useStateStore(), {
      store,
      onStateChange: onChange,
    });
    result.set("/x", 99);
    expect(onChange).not.toHaveBeenCalled();
  });
});

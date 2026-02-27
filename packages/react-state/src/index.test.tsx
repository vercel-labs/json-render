import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { createStateStore } from "@json-render/core";
import {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
} from "./index";

// ============================================================================
// Uncontrolled mode (default)
// ============================================================================

describe("StateProvider (uncontrolled)", () => {
  it("provides initial state to children", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ user: { name: "John" } }}>
        {children}
      </StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    expect(result.current.state).toEqual({ user: { name: "John" } });
  });

  it("provides empty object when no initial state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    expect(result.current.state).toEqual({});
  });
});

describe("useStateStore (uncontrolled)", () => {
  it("provides get function to retrieve values", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ user: { name: "John" } }}>
        {children}
      </StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    expect(result.current.get("/user/name")).toBe("John");
  });

  it("allows setting state at path with set function", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{}}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    act(() => {
      result.current.set("/user/name", "Alice");
    });

    expect((result.current.state.user as Record<string, unknown>).name).toBe(
      "Alice",
    );
  });

  it("calls onStateChange callback with changes array on set", () => {
    const onStateChange = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{}} onStateChange={onStateChange}>
        {children}
      </StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    act(() => {
      result.current.set("/count", 42);
    });

    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith([{ path: "/count", value: 42 }]);
  });

  it("calls onStateChange callback once with all changes on update", () => {
    const onStateChange = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{}} onStateChange={onStateChange}>
        {children}
      </StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    act(() => {
      result.current.update({ "/name": "John", "/age": 30 });
    });

    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith([
      { path: "/name", value: "John" },
      { path: "/age", value: 30 },
    ]);
  });

  it("allows updating multiple values with update function", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{}}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    act(() => {
      result.current.update({
        "/name": "John",
        "/age": 30,
      });
    });

    expect(result.current.state.name).toBe("John");
    expect(result.current.state.age).toBe(30);
  });
});

describe("useStateValue", () => {
  it("returns value at specified path", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ user: { name: "John", age: 30 } }}>
        {children}
      </StateProvider>
    );

    const { result } = renderHook(() => useStateValue("/user/name"), {
      wrapper,
    });

    expect(result.current).toBe("John");
  });

  it("returns undefined for missing path", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{}}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateValue("/missing"), { wrapper });

    expect(result.current).toBeUndefined();
  });

  it("updates when state changes", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ count: 0 }}>{children}</StateProvider>
    );

    const { result, rerender } = renderHook(
      () => ({
        store: useStateStore(),
        value: useStateValue<number>("/count"),
      }),
      { wrapper },
    );

    expect(result.current.value).toBe(0);

    act(() => {
      result.current.store.set("/count", 5);
    });

    rerender();
    expect(result.current.value).toBe(5);
  });
});

describe("useStateBinding", () => {
  it("returns tuple with value and setter for path", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ name: "John" }}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateBinding("/name"), { wrapper });

    const [value, setValue] = result.current;
    expect(value).toBe("John");
    expect(typeof setValue).toBe("function");
  });

  it("setter updates the value", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ name: "John" }}>{children}</StateProvider>
    );

    const { result, rerender } = renderHook(() => useStateBinding("/name"), {
      wrapper,
    });

    act(() => {
      const [, setValue] = result.current;
      setValue("Alice");
    });

    rerender();
    const [value] = result.current;
    expect(value).toBe("Alice");
  });
});

// ============================================================================
// Controlled mode (external store)
// ============================================================================

describe("StateProvider (controlled mode)", () => {
  it("reads initial state from the external store", () => {
    const store = createStateStore({ count: 7 });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider store={store}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    expect(result.current.state).toEqual({ count: 7 });
    expect(result.current.get("/count")).toBe(7);
  });

  it("re-renders when the external store updates", () => {
    const store = createStateStore({ count: 0 });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider store={store}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateValue<number>("/count"), {
      wrapper,
    });

    expect(result.current).toBe(0);

    act(() => {
      store.set("/count", 42);
    });

    expect(result.current).toBe(42);
  });

  it("set() writes through to the external store", () => {
    const store = createStateStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider store={store}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    act(() => {
      result.current.set("/name", "Alice");
    });

    expect(store.getSnapshot().name).toBe("Alice");
    expect(result.current.state.name).toBe("Alice");
  });

  it("update() writes multiple values through to the external store", () => {
    const store = createStateStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider store={store}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    act(() => {
      result.current.update({ "/a": 1, "/b": 2 });
    });

    expect(store.getSnapshot().a).toBe(1);
    expect(store.getSnapshot().b).toBe(2);
  });

  it("does NOT call onStateChange when using an external store", () => {
    const store = createStateStore({});
    const onStateChange = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider store={store} onStateChange={onStateChange}>
        {children}
      </StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    act(() => {
      result.current.set("/x", 99);
    });

    expect(onStateChange).not.toHaveBeenCalled();
  });

  it("ignores initialState when an external store is provided", () => {
    const store = createStateStore({ fromStore: true });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider store={store} initialState={{ fromProp: true }}>
        {children}
      </StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    expect(result.current.state).toEqual({ fromStore: true });
    expect(result.current.get("/fromProp")).toBeUndefined();
  });
});

// ============================================================================
// initialState sync fast-path
// ============================================================================

describe("StateProvider initialState sync", () => {
  it("does not re-flatten when initialState reference is unchanged", () => {
    const initialState = { count: 0 };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={initialState}>{children}</StateProvider>
    );

    const { result, rerender } = renderHook(() => useStateStore(), { wrapper });

    expect(result.current.state).toEqual({ count: 0 });

    act(() => {
      result.current.set("/count", 5);
    });

    rerender();
    expect(result.current.state.count).toBe(5);
  });
});

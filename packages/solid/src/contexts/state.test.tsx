import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { createEffect, createSignal, type Accessor, type JSX } from "solid-js";
import { createStateStore } from "@json-render/core";
import {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
} from "./state";

function renderWithState<T>(
  hook: () => T,
  initialState: Record<string, unknown> = {},
  extraProps?: { store?: any; onStateChange?: any },
): T {
  let result!: T;
  function TestComponent(): JSX.Element {
    result = hook();
    return (<div data-testid="test" />) as unknown as JSX.Element;
  }
  render(() => (
    <StateProvider initialState={initialState} {...(extraProps ?? {})}>
      <TestComponent />
    </StateProvider>
  ));
  return result;
}

describe("StateProvider + hooks", () => {
  it("useStateStore() throws outside provider", () => {
    expect(() => useStateStore()).toThrow(
      "useStateStore must be used within a StateProvider",
    );
  });

  it("StateProvider + useStateStore round-trip (get + set)", () => {
    const ctx = renderWithState(() => useStateStore(), { count: 0 });

    expect(ctx.get("/count")).toBe(0);
    ctx.set("/count", 42);
    expect(ctx.get("/count")).toBe(42);
  });

  it("useStateValue reads from state", () => {
    const value = renderWithState(() => useStateValue("/name"), {
      name: "Alice",
    });

    expect(value()).toBe("Alice");
  });

  it("useStateBinding returns value and setter", () => {
    const [value, setValue] = renderWithState(() => useStateBinding("/x"), {
      x: 1,
    });

    expect(value()).toBe(1);
    expect(typeof setValue).toBe("function");
  });

  it("useStateValue stays reactive after state updates", () => {
    const observed: Array<string | undefined> = [];

    function TestComponent(): JSX.Element {
      const value = useStateValue<string>("/name");
      createEffect(() => {
        observed.push(value());
      });
      const store = useStateStore();
      return (
        <button
          data-testid="update"
          onClick={() => store.set("/name", "Bob")}
        />
      ) as unknown as JSX.Element;
    }

    const { getByTestId } = render(() => (
      <StateProvider initialState={{ name: "Alice" }}>
        <TestComponent />
      </StateProvider>
    ));

    expect(observed).toEqual(["Alice"]);
    getByTestId("update").click();
    expect(observed).toEqual(["Alice", "Bob"]);
  });

  it("useStateBinding value accessor stays reactive after state updates", () => {
    const observed: Array<number | undefined> = [];

    function TestComponent(): JSX.Element {
      const [value, setValue] = useStateBinding<number>("/count");
      createEffect(() => {
        observed.push(value());
      });
      return (
        <button data-testid="update" onClick={() => setValue(2)} />
      ) as unknown as JSX.Element;
    }

    const { getByTestId } = render(() => (
      <StateProvider initialState={{ count: 1 }}>
        <TestComponent />
      </StateProvider>
    ));

    expect(observed).toEqual([1]);
    getByTestId("update").click();
    expect(observed).toEqual([1, 2]);
  });

  it("provides initial state to consumers", () => {
    const ctx = renderWithState(() => useStateStore(), { a: 1, b: "hello" });

    expect(ctx.state).toEqual({ a: 1, b: "hello" });
  });

  it("provides empty object when no initial state", () => {
    const ctx = renderWithState(() => useStateStore());

    expect(ctx.state).toEqual({});
  });

  it("get() retrieves values by path", () => {
    const ctx = renderWithState(() => useStateStore(), {
      user: { name: "Bob" },
    });

    expect(ctx.get("/user/name")).toBe("Bob");
  });

  it("get() returns undefined for missing path", () => {
    const ctx = renderWithState(() => useStateStore(), {
      user: { name: "Bob" },
    });

    expect(ctx.get("/user/age")).toBeUndefined();
  });

  it("set() updates values at path", () => {
    const ctx = renderWithState(() => useStateStore(), { x: 0 });

    ctx.set("/x", 42);
    expect(ctx.get("/x")).toBe(42);
  });

  it("set() creates nested paths", () => {
    const ctx = renderWithState(() => useStateStore());

    ctx.set("/a/b/c", "deep");
    expect(ctx.get("/a/b/c")).toBe("deep");
  });

  it("set() calls onStateChange callback", () => {
    const onChange = vi.fn();
    const ctx = renderWithState(
      () => useStateStore(),
      {},
      { onStateChange: onChange },
    );

    ctx.set("/name", "Alice");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([{ path: "/name", value: "Alice" }]);
  });

  it("update() handles multiple values at once", () => {
    const ctx = renderWithState(() => useStateStore());

    ctx.update({ "/a": 1, "/b": "hello" });
    expect(ctx.get("/a")).toBe(1);
    expect(ctx.get("/b")).toBe("hello");
  });

  it("update() calls onStateChange with all changes", () => {
    const onChange = vi.fn();
    const ctx = renderWithState(
      () => useStateStore(),
      {},
      { onStateChange: onChange },
    );

    ctx.update({ "/a": 1, "/b": 2 });
    expect(onChange).toHaveBeenCalledOnce();
    const [changes] = onChange.mock.calls[0]!;
    expect(changes).toEqual(
      expect.arrayContaining([
        { path: "/a", value: 1 },
        { path: "/b", value: 2 },
      ]),
    );
  });

  it("handles deeply nested state paths", () => {
    const ctx = renderWithState(() => useStateStore());

    ctx.set("/a/b/c/d", "nested");
    expect(ctx.get("/a/b/c/d")).toBe("nested");
  });

  it("controlled mode: reads/writes through external StateStore", () => {
    const store = createStateStore({ x: 10 });
    const ctx = renderWithState(() => useStateStore(), {}, { store });

    expect(ctx.get("/x")).toBe(10);

    ctx.set("/x", 99);
    expect(store.getSnapshot()).toEqual({ x: 99 });

    store.set("/x", 200);
    expect(store.get("/x")).toBe(200);
  });
});

import { describe, it, expect, vi } from "vitest";
import { mount, unmount } from "svelte";
import { createStateStore } from "@json-render/core";
import StateProvider, { getStateContext } from "./StateProvider.svelte";

function component(
  runTest: () => void,
  props: {
    initialState?: Record<string, unknown>;
    onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
    store?: ReturnType<typeof createStateStore>;
  } = {},
) {
  return () => {
    const c = mount(
      ((_anchor: any) => {
        (StateProvider as any)(_anchor, {
          ...props,
          children: (() => {
            runTest();
          }) as any,
        });
      }) as any,
      { target: document.body },
    );
    unmount(c);
  };
}

describe("StateProvider", () => {
  it(
    "provides initial state to consumers",
    component(
      () => {
        const ctx = getStateContext();
        expect(ctx.state).toEqual({ user: { name: "John" } });
      },
      { initialState: { user: { name: "John" } } },
    ),
  );

  it(
    "provides empty object when no initial state",
    component(() => {
      const ctx = getStateContext();
      expect(ctx.state).toEqual({});
    }),
  );
});

describe("StateContext.get", () => {
  it(
    "retrieves values by path",
    component(
      () => {
        const ctx = getStateContext();
        expect(ctx.get("/user/name")).toBe("John");
        expect(ctx.get("/user/age")).toBe(30);
      },
      { initialState: { user: { name: "John", age: 30 } } },
    ),
  );

  it(
    "returns undefined for missing path",
    component(
      () => {
        const ctx = getStateContext();
        expect(ctx.get("/user/email")).toBeUndefined();
        expect(ctx.get("/nonexistent")).toBeUndefined();
      },
      { initialState: { user: { name: "John" } } },
    ),
  );
});

describe("StateContext.set", () => {
  it(
    "updates values at path",
    component(
      () => {
        const ctx = getStateContext();
        ctx.set("/count", 5);
        expect(ctx.state.count).toBe(5);
      },
      { initialState: { count: 0 } },
    ),
  );

  it(
    "creates nested paths",
    component(() => {
      const ctx = getStateContext();
      ctx.set("/user/name", "Jane");
      expect(ctx.get("/user/name")).toBe("Jane");
    }),
  );

  it(
    "calls onStateChange callback with change entries",
    component(
      () => {
        const ctx = getStateContext();
        ctx.set("/value", 2);
      },
      {
        initialState: { value: 1 },
        onStateChange: vi.fn((changes) => {
          expect(changes).toEqual([{ path: "/value", value: 2 }]);
        }),
      },
    ),
  );
});

describe("StateContext.update", () => {
  it(
    "handles multiple values at once",
    component(
      () => {
        const ctx = getStateContext();
        ctx.update({ "/a": 10, "/b": 20 });
        expect(ctx.state.a).toBe(10);
        expect(ctx.state.b).toBe(20);
      },
      { initialState: { a: 1, b: 2 } },
    ),
  );

  it(
    "calls onStateChange once with all changed updates",
    component(
      () => {
        const ctx = getStateContext();
        ctx.update({ "/x": 1, "/y": 2 });
      },
      {
        initialState: { x: 0, y: 0 },
        onStateChange: vi.fn((changes) => {
          expect(changes).toEqual([
            { path: "/x", value: 1 },
            { path: "/y", value: 2 },
          ]);
        }),
      },
    ),
  );
});

describe("StateContext nested paths", () => {
  it(
    "handles deeply nested state paths",
    component(
      () => {
        const ctx = getStateContext();
        expect(ctx.get("/app/settings/theme")).toBe("light");
        expect(ctx.get("/app/settings/notifications/enabled")).toBe(true);
        ctx.set("/app/settings/theme", "dark");
        expect(ctx.get("/app/settings/theme")).toBe("dark");
      },
      {
        initialState: {
          app: {
            settings: {
              theme: "light",
              notifications: { enabled: true },
            },
          },
        },
      },
    ),
  );

  it(
    "handles array indices in paths",
    component(
      () => {
        const ctx = getStateContext();
        expect(ctx.get("/items/0")).toBe("a");
        expect(ctx.get("/items/1")).toBe("b");
        ctx.set("/items/1", "B");
        expect(ctx.get("/items/1")).toBe("B");
      },
      { initialState: { items: ["a", "b", "c"] } },
    ),
  );
});

describe("controlled mode", () => {
  it(
    "reads and writes through external StateStore",
    (() => {
      const store = createStateStore({ count: 1 });
      const onStateChange = vi.fn();
      return component(
        () => {
          const ctx = getStateContext();
          expect(ctx.get("/count")).toBe(1);
          ctx.set("/count", 2);
          expect(store.get("/count")).toBe(2);
          expect(onStateChange).not.toHaveBeenCalled();
        },
        { store, onStateChange },
      );
    })(),
  );
});

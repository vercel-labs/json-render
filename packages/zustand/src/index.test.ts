import { describe, it, expect, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { zustandStateStore } from "./index";

describe("zustandStateStore", () => {
  it("get/set round-trip", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({ count: 0 }));
    const store = zustandStateStore({ store: zStore });

    expect(store.get("/count")).toBe(0);

    store.set("/count", 42);

    expect(store.get("/count")).toBe(42);
    expect(store.getSnapshot().count).toBe(42);
  });

  it("update round-trip with multiple values", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({}));
    const store = zustandStateStore({ store: zStore });

    store.update({ "/a": 1, "/b": "hello" });

    expect(store.get("/a")).toBe(1);
    expect(store.get("/b")).toBe("hello");
    expect(store.getSnapshot()).toEqual({ a: 1, b: "hello" });
  });

  it("subscribe fires on set", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({}));
    const store = zustandStateStore({ store: zStore });
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("/x", 1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("subscribe fires on update", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({}));
    const store = zustandStateStore({ store: zStore });
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ "/a": 1, "/b": 2 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops notifications", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({}));
    const store = zustandStateStore({ store: zStore });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.set("/x", 1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.set("/x", 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("getSnapshot immutability -- previous snapshot is not mutated", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({
      user: { name: "Alice", age: 30 },
    }));
    const store = zustandStateStore({ store: zStore });
    const snap1 = store.getSnapshot();

    store.set("/user/name", "Bob");
    const snap2 = store.getSnapshot();

    expect(snap1.user).toEqual({ name: "Alice", age: 30 });
    expect((snap2.user as Record<string, unknown>).name).toBe("Bob");
    expect(snap1.user).not.toBe(snap2.user);
  });

  it("structural sharing -- untouched branches keep references", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({
      a: { x: 1 },
      b: { y: 2 },
    }));
    const store = zustandStateStore({ store: zStore });
    const snap1 = store.getSnapshot();

    store.set("/a/x", 99);
    const snap2 = store.getSnapshot();

    expect(snap2.b).toBe(snap1.b);
    expect(snap2.a).not.toBe(snap1.a);
  });

  it("getServerSnapshot returns same as getSnapshot", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({ x: 1 }));
    const store = zustandStateStore({ store: zStore });

    expect(store.getServerSnapshot!()).toBe(store.getSnapshot());

    store.set("/x", 2);
    expect(store.getServerSnapshot!()).toBe(store.getSnapshot());
  });

  it("set skips update when value is unchanged", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({ x: 1 }));
    const store = zustandStateStore({ store: zStore });
    const snap1 = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("/x", 1);

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(snap1);
  });

  it("update skips update when no values changed", () => {
    const zStore = createStore<Record<string, unknown>>()(() => ({
      a: 1,
      b: 2,
    }));
    const store = zustandStateStore({ store: zStore });
    const snap1 = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ "/a": 1, "/b": 2 });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(snap1);
  });

  it("subscribe does NOT fire when unrelated slice changes", () => {
    interface AppState extends Record<string, unknown> {
      ui: Record<string, unknown>;
      other: { value: string };
    }

    const zStore = createStore<AppState>()(() => ({
      ui: { count: 0 },
      other: { value: "a" },
    }));

    const store = zustandStateStore({
      store: zStore,
      selector: (s) => s.ui,
      updater: (next, s) => s.setState({ ui: next }),
    });

    const listener = vi.fn();
    store.subscribe(listener);

    zStore.setState({ other: { value: "b" } });

    expect(listener).not.toHaveBeenCalled();
    expect(store.get("/count")).toBe(0);
  });

  it("default updater preserves keys outside the json-render model", () => {
    interface AppState extends Record<string, unknown> {
      count: number;
      theme: string;
    }

    const zStore = createStore<AppState>()(() => ({
      count: 0,
      theme: "dark",
    }));
    const store = zustandStateStore({ store: zStore });

    store.set("/count", 5);

    expect(store.get("/count")).toBe(5);
    expect(zStore.getState().theme).toBe("dark");
  });

  it("works with custom selector and updater", () => {
    interface AppState extends Record<string, unknown> {
      ui: Record<string, unknown>;
    }

    const zStore = createStore<AppState>()(() => ({
      ui: { count: 0 },
    }));

    const store = zustandStateStore({
      store: zStore,
      selector: (s) => s.ui,
      updater: (next, s) => s.setState({ ui: next }),
    });

    store.set("/count", 5);

    expect(store.get("/count")).toBe(5);
    expect(zStore.getState().ui.count).toBe(5);
  });
});

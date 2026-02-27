import { describe, it, expect, vi } from "vitest";
import { createAtom } from "@xstate/store";
import { xstateStoreStateStore } from "./index";

function createTestStore(initial: Record<string, unknown> = {}) {
  const atom = createAtom<Record<string, unknown>>(initial);
  const store = xstateStoreStateStore({ atom });
  return { atom, store };
}

describe("xstateStoreStateStore", () => {
  it("get/set round-trip", () => {
    const { store } = createTestStore({ count: 0 });

    expect(store.get("/count")).toBe(0);

    store.set("/count", 42);

    expect(store.get("/count")).toBe(42);
    expect(store.getSnapshot().count).toBe(42);
  });

  it("update round-trip with multiple values", () => {
    const { store } = createTestStore({});

    store.update({ "/a": 1, "/b": "hello" });

    expect(store.get("/a")).toBe(1);
    expect(store.get("/b")).toBe("hello");
    expect(store.getSnapshot()).toEqual({ a: 1, b: "hello" });
  });

  it("subscribe fires on set", () => {
    const { store } = createTestStore({});
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("/x", 1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("subscribe fires on update", () => {
    const { store } = createTestStore({});
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ "/a": 1, "/b": 2 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops notifications", () => {
    const { store } = createTestStore({});
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.set("/x", 1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.set("/x", 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("getSnapshot immutability -- previous snapshot is not mutated", () => {
    const { store } = createTestStore({
      user: { name: "Alice", age: 30 },
    });
    const snap1 = store.getSnapshot();

    store.set("/user/name", "Bob");
    const snap2 = store.getSnapshot();

    expect(snap1.user).toEqual({ name: "Alice", age: 30 });
    expect((snap2.user as Record<string, unknown>).name).toBe("Bob");
    expect(snap1.user).not.toBe(snap2.user);
  });

  it("structural sharing -- untouched branches keep references", () => {
    const { store } = createTestStore({
      a: { x: 1 },
      b: { y: 2 },
    });
    const snap1 = store.getSnapshot();

    store.set("/a/x", 99);
    const snap2 = store.getSnapshot();

    expect(snap2.b).toBe(snap1.b);
    expect(snap2.a).not.toBe(snap1.a);
  });

  it("getServerSnapshot returns same as getSnapshot", () => {
    const { store } = createTestStore({ x: 1 });

    expect(store.getServerSnapshot!()).toBe(store.getSnapshot());

    store.set("/x", 2);
    expect(store.getServerSnapshot!()).toBe(store.getSnapshot());
  });

  it("set skips update when value is unchanged", () => {
    const { store } = createTestStore({ x: 1 });
    const snap1 = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("/x", 1);

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(snap1);
  });

  it("update skips update when no values changed", () => {
    const { store } = createTestStore({ a: 1, b: 2 });
    const snap1 = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ "/a": 1, "/b": 2 });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(snap1);
  });

  it("reads from the shared atom", () => {
    const atom = createAtom<Record<string, unknown>>({ count: 0 });
    const store = xstateStoreStateStore({ atom });

    atom.set({ count: 99 });

    expect(store.get("/count")).toBe(99);
    expect(store.getSnapshot().count).toBe(99);
  });

  it("subscribe fires on external atom.set", () => {
    const atom = createAtom<Record<string, unknown>>({ count: 0 });
    const store = xstateStoreStateStore({ atom });
    const listener = vi.fn();
    store.subscribe(listener);

    atom.set({ count: 99 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get("/count")).toBe(99);
  });
});

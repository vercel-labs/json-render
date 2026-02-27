import { describe, it, expect, vi } from "vitest";
import { createStateStore, flattenToPointers } from "./state-store";

describe("createStateStore", () => {
  it("creates a store with initial state", () => {
    const store = createStateStore({ name: "test" });
    expect(store.getSnapshot()).toEqual({ name: "test" });
    expect(store.get("/name")).toBe("test");
  });

  it("set notifies subscribers", () => {
    const store = createStateStore({});
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("/x", 1);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get("/x")).toBe(1);
  });

  it("set skips notification when value is unchanged", () => {
    const store = createStateStore({ x: 1 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("/x", 1);

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual({ x: 1 });
  });

  it("update notifies subscribers once", () => {
    const store = createStateStore({});
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ "/a": 1, "/b": 2 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get("/a")).toBe(1);
    expect(store.get("/b")).toBe(2);
  });

  it("update skips notification when no values changed", () => {
    const store = createStateStore({ a: 1, b: 2 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ "/a": 1, "/b": 2 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("unsubscribe stops notifications", () => {
    const store = createStateStore({});
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set("/x", 1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set("/x", 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("getSnapshot returns a new reference after mutation", () => {
    const store = createStateStore({ x: 1 });
    const snap1 = store.getSnapshot();

    store.set("/x", 2);
    const snap2 = store.getSnapshot();

    expect(snap1).not.toBe(snap2);
    expect(snap2.x).toBe(2);
  });

  it("getSnapshot returns same reference when set is a no-op", () => {
    const store = createStateStore({ x: 1 });
    const snap1 = store.getSnapshot();

    store.set("/x", 1);
    const snap2 = store.getSnapshot();

    expect(snap1).toBe(snap2);
  });

  it("set on nested path does not mutate previous snapshot", () => {
    const store = createStateStore({ user: { name: "Alice", age: 30 } });
    const snap1 = store.getSnapshot();

    store.set("/user/name", "Bob");
    const snap2 = store.getSnapshot();

    expect(snap1.user).toEqual({ name: "Alice", age: 30 });
    expect((snap2.user as Record<string, unknown>).name).toBe("Bob");
    expect(snap1.user).not.toBe(snap2.user);
  });

  it("update on nested paths does not mutate previous snapshot", () => {
    const store = createStateStore({
      user: { name: "Alice" },
      meta: { version: 1 },
    });
    const snap1 = store.getSnapshot();

    store.update({ "/user/name": "Bob", "/meta/version": 2 });
    const snap2 = store.getSnapshot();

    expect((snap1.user as Record<string, unknown>).name).toBe("Alice");
    expect((snap1.meta as Record<string, unknown>).version).toBe(1);
    expect((snap2.user as Record<string, unknown>).name).toBe("Bob");
    expect((snap2.meta as Record<string, unknown>).version).toBe(2);
  });

  it("set preserves structural sharing for untouched branches", () => {
    const store = createStateStore({
      a: { x: 1 },
      b: { y: 2 },
    });
    const snap1 = store.getSnapshot();

    store.set("/a/x", 99);
    const snap2 = store.getSnapshot();

    expect(snap2.b).toBe(snap1.b);
    expect(snap2.a).not.toBe(snap1.a);
  });

  it("getServerSnapshot returns the same state as getSnapshot", () => {
    const store = createStateStore({ x: 1 });
    expect(store.getServerSnapshot!()).toBe(store.getSnapshot());

    store.set("/x", 2);
    expect(store.getServerSnapshot!()).toBe(store.getSnapshot());
  });
});

describe("flattenToPointers", () => {
  it("flattens top-level keys", () => {
    expect(flattenToPointers({ a: 1, b: "hello" })).toEqual({
      "/a": 1,
      "/b": "hello",
    });
  });

  it("flattens nested plain objects", () => {
    expect(flattenToPointers({ user: { name: "Alice", age: 30 } })).toEqual({
      "/user/name": "Alice",
      "/user/age": 30,
    });
  });

  it("preserves arrays as leaf values", () => {
    expect(flattenToPointers({ items: [1, 2, 3] })).toEqual({
      "/items": [1, 2, 3],
    });
  });

  it("preserves null as a leaf value", () => {
    expect(flattenToPointers({ x: null })).toEqual({ "/x": null });
  });

  it("handles deeply nested objects", () => {
    expect(flattenToPointers({ a: { b: { c: 42 } } })).toEqual({
      "/a/b/c": 42,
    });
  });

  it("returns empty object for empty input", () => {
    expect(flattenToPointers({})).toEqual({});
  });

  it("handles mixed nesting", () => {
    expect(
      flattenToPointers({
        count: 1,
        user: { name: "Alice" },
        tags: ["a", "b"],
      }),
    ).toEqual({
      "/count": 1,
      "/user/name": "Alice",
      "/tags": ["a", "b"],
    });
  });

  it("stops recursion on circular references via seen set", () => {
    const obj: Record<string, unknown> = { name: "root" };
    obj.self = obj;

    const result = flattenToPointers(obj);

    expect(result["/name"]).toBe("root");
    expect(result["/self/name"]).toBe("root");
    expect(result["/self/self"]).toBe(obj);
  });

  it("caps recursion at depth limit", () => {
    let current: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 25; i++) {
      current = { nested: current };
    }

    const result = flattenToPointers(current);

    const keys = Object.keys(result);
    expect(keys.length).toBe(1);
    const key = keys[0]!;
    expect(key.split("/").length).toBeLessThanOrEqual(22);
  });
});

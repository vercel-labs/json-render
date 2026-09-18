import { describe, it, expect, vi } from "vitest";
import {
  createStateStore,
  createStoreAdapter,
  flattenToPointers,
  immutableSetByPath,
} from "./state-store";

function createAdapterHarness(initialState: Record<string, unknown>) {
  let snapshot = initialState;
  const listeners = new Set<() => void>();
  const setSnapshot = vi.fn((next: Record<string, unknown>) => {
    snapshot = next;
    for (const listener of listeners) {
      listener();
    }
  });
  const store = createStoreAdapter({
    getSnapshot: () => snapshot,
    setSnapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });

  return {
    store,
    getSnapshot: () => snapshot,
    setSnapshot,
  };
}

describe("immutableSetByPath", () => {
  it.each(["01", "1x", "1.5", "-1", "4294967295"])(
    "returns the original snapshot for invalid array leaf token %j",
    (token) => {
      const root = { items: ["zero", "one"] };
      const result = immutableSetByPath(root, `/items/${token}`, "changed");

      expect(result).toBe(root);
      expect(root.items).toEqual(["zero", "one"]);
      expect(Object.keys(root.items)).toEqual(["0", "1"]);
    },
  );

  it.each(["01", "1x", "1.5", "-1", "4294967295"])(
    "returns the original snapshot for invalid intermediate array token %j",
    (token) => {
      const root = { items: [{ values: ["zero", "one"] }] };
      const result = immutableSetByPath(
        root,
        `/items/0/values/${token}/name`,
        "changed",
      );

      expect(result).toBe(root);
      expect(root.items[0]!.values).toEqual(["zero", "one"]);
      expect(Object.keys(root.items[0]!.values)).toEqual(["0", "1"]);
    },
  );

  it("preserves structural sharing and infers canonical arrays only", () => {
    const root = {
      items: [{ name: "old", untouched: true }],
      sibling: { retained: true },
    };
    const result = immutableSetByPath(root, "/items/0/name", "new");
    const inferred = immutableSetByPath({}, "/records/01/name", "literal");
    const appended = immutableSetByPath({}, "/items/-", "appended");
    const resultItems = result.items as Array<Record<string, unknown>>;

    expect(result).not.toBe(root);
    expect(result.items).not.toBe(root.items);
    expect(resultItems[0]).not.toBe(root.items[0]);
    expect(result.sibling).toBe(root.sibling);
    expect(root.items[0]).toEqual({ name: "old", untouched: true });
    expect(resultItems[0]).toEqual({ name: "new", untouched: true });
    expect(inferred).toEqual({ records: { "01": { name: "literal" } } });
    expect(appended).toEqual({ items: ["appended"] });
  });

  it.each(["__proto__", "constructor", "prototype"])(
    "rejects %s without changing snapshot identity or its prototype",
    (token) => {
      const state = { safe: true };
      const result = immutableSetByPath(state, `/${token}/polluted`, "value");

      expect(result).toBe(state);
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(result).toEqual({ safe: true });
    },
  );
});

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

  it("silently ignores malformed array writes without changing snapshot identity", () => {
    const store = createStateStore({
      items: [{ values: ["zero", "one"] }],
    });
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    store.set("/items/01", "changed");
    store.set("/items/0/values/01/name", "changed");

    expect(store.getSnapshot()).toBe(before);
    expect(store.getSnapshot().items).toEqual([{ values: ["zero", "one"] }]);
    expect(Object.keys(store.getSnapshot().items as unknown[])).toEqual(["0"]);
    expect(
      Object.keys(
        (store.getSnapshot().items as Array<Record<string, unknown>>)[0]!
          .values as unknown[],
      ),
    ).toEqual(["0", "1"]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("skips all-invalid batches and applies mixed batches only once", () => {
    const store = createStateStore({ items: ["zero"], stable: true });
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    store.update({ "/items/01": "ignored", "/items/1x": "ignored" });
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();

    store.update({ "/items/01": "ignored", "/stable": false });
    expect(store.getSnapshot()).toEqual({ items: ["zero"], stable: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("evaluates batch entries against progressively updated state", () => {
    const store = createStateStore({});

    store.update({ "/items": [], "/items/0/name": "first" });

    expect(store.getSnapshot()).toEqual({ items: [{ name: "first" }] });
  });

  it.each(["__proto__", "constructor", "prototype"])(
    "rejects %s state paths without publishing a snapshot",
    (token) => {
      const store = createStateStore({ safe: true });
      const listener = vi.fn();
      const snapshot = store.getSnapshot();
      store.subscribe(listener);

      store.set(`/${token}/polluted`, "value");
      store.update({ [`/safe/${token}/polluted`]: "value" });

      expect(store.getSnapshot()).toBe(snapshot);
      expect(listener).not.toHaveBeenCalled();
    },
  );
});

describe("createStoreAdapter", () => {
  it("does not write snapshots for invalid sets or all-invalid batches", () => {
    const harness = createAdapterHarness({ items: ["zero", "one"] });
    const listener = vi.fn();
    harness.store.subscribe(listener);
    const before = harness.getSnapshot();

    harness.store.set("/items/01", "changed");
    harness.store.update({
      "/items/1x": "ignored",
      "/items/1.5": "ignored",
    });

    expect(harness.getSnapshot()).toBe(before);
    expect(harness.setSnapshot).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(Object.keys(harness.getSnapshot().items as unknown[])).toEqual([
      "0",
      "1",
    ]);
  });

  it("writes once for a mixed batch and preserves earlier snapshots", () => {
    const harness = createAdapterHarness({
      items: ["zero"],
      nested: { untouched: true },
    });
    const listener = vi.fn();
    harness.store.subscribe(listener);
    const before = harness.getSnapshot();

    harness.store.update({
      "/items/01": "ignored",
      "/items/1": "one",
      "/nested/untouched": false,
    });

    const after = harness.getSnapshot();
    expect(harness.setSnapshot).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(after).toEqual({
      items: ["zero", "one"],
      nested: { untouched: false },
    });
    expect(before).toEqual({
      items: ["zero"],
      nested: { untouched: true },
    });
    expect(after.items).not.toBe(before.items);
    expect(after.nested).not.toBe(before.nested);
  });

  it("evaluates sequential adapter batch paths against the latest snapshot", () => {
    const harness = createAdapterHarness({});

    harness.store.update({ "/items": [], "/items/0/name": "first" });

    expect(harness.setSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.getSnapshot()).toEqual({ items: [{ name: "first" }] });
  });

  it.each(["__proto__", "constructor", "prototype"])(
    "rejects %s state paths without writing a snapshot",
    (token) => {
      const harness = createAdapterHarness({ safe: true });
      const snapshot = harness.getSnapshot();

      harness.store.set(`/${token}/polluted`, "value");
      harness.store.update({ [`/safe/${token}/polluted`]: "value" });

      expect(harness.getSnapshot()).toBe(snapshot);
      expect(harness.setSnapshot).not.toHaveBeenCalled();
    },
  );
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

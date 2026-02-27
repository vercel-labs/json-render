import { describe, it, expect, vi } from "vitest";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { reduxStateStore } from "./index";

function createTestStore(initial: Record<string, unknown> = {}) {
  const uiSlice = createSlice({
    name: "ui",
    initialState: initial as Record<string, unknown>,
    reducers: {
      replace: (_state, action) => action.payload,
    },
  });

  const reduxStore = configureStore({
    reducer: { ui: uiSlice.reducer },
  });

  const store = reduxStateStore({
    store: reduxStore,
    selector: (state) => state.ui as Record<string, unknown>,
    dispatch: (next, s) => s.dispatch(uiSlice.actions.replace(next)),
  });

  return { reduxStore, store, uiSlice };
}

describe("reduxStateStore", () => {
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
    const { store } = createTestStore({ user: { name: "Alice", age: 30 } });
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

  it("subscribe does NOT fire when unrelated slice changes", () => {
    const uiSlice = createSlice({
      name: "ui",
      initialState: { count: 0 } as Record<string, unknown>,
      reducers: {
        replace: (_state, action) => action.payload,
      },
    });

    const otherSlice = createSlice({
      name: "other",
      initialState: { value: "a" },
      reducers: {
        update: (state, action) => {
          state.value = action.payload;
        },
      },
    });

    const reduxStore = configureStore({
      reducer: {
        ui: uiSlice.reducer,
        other: otherSlice.reducer,
      },
    });

    const store = reduxStateStore({
      store: reduxStore,
      selector: (state) => state.ui as Record<string, unknown>,
      dispatch: (next, s) => s.dispatch(uiSlice.actions.replace(next)),
    });

    const listener = vi.fn();
    store.subscribe(listener);

    reduxStore.dispatch(otherSlice.actions.update("b"));

    expect(listener).not.toHaveBeenCalled();
    expect(store.get("/count")).toBe(0);
  });

  it("set skips dispatch when value is unchanged", () => {
    const { store } = createTestStore({ x: 1 });
    const snap1 = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("/x", 1);

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(snap1);
  });

  it("update skips dispatch when no values changed", () => {
    const { store } = createTestStore({ a: 1, b: 2 });
    const snap1 = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ "/a": 1, "/b": 2 });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(snap1);
  });

  it("works with identity selector (entire state is the model)", () => {
    const slice = createSlice({
      name: "root",
      initialState: { x: 1 } as Record<string, unknown>,
      reducers: {
        replace: (_state, action) => action.payload,
      },
    });

    const reduxStore = configureStore({
      reducer: slice.reducer,
    });

    const store = reduxStateStore({
      store: reduxStore,
      selector: (s) => s as Record<string, unknown>,
      dispatch: (next, s) => s.dispatch(slice.actions.replace(next)),
    });

    expect(store.get("/x")).toBe(1);

    store.set("/x", 2);
    expect(store.get("/x")).toBe(2);
  });

  it("defaults selector to identity when omitted", () => {
    const slice = createSlice({
      name: "root",
      initialState: { x: 1 } as Record<string, unknown>,
      reducers: {
        replace: (_state, action) => action.payload,
      },
    });

    const reduxStore = configureStore({
      reducer: slice.reducer,
    });

    const store = reduxStateStore({
      store: reduxStore,
      dispatch: (next, s) => s.dispatch(slice.actions.replace(next)),
    });

    expect(store.get("/x")).toBe(1);

    store.set("/x", 2);
    expect(store.get("/x")).toBe(2);
  });
});

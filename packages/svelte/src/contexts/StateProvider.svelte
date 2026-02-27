<script module lang="ts">
  import { getContext } from "svelte";
  import type { StateModel } from "@json-render/core";

  const STATE_KEY = Symbol.for("json-render-state");

  /**
   * State context value
   */
  export interface StateContext {
    /** The current state model (reactive) */
    readonly state: StateModel;
    /** Get a value by path */
    get: (path: string) => unknown;
    /** Set a value by path */
    set: (path: string, value: unknown) => void;
    /** Update multiple values at once */
    update: (updates: Record<string, unknown>) => void;
    /** Return the live state snapshot from the underlying store. */
    getSnapshot: () => StateModel;
  }

  export interface CurrentValue<T> {
    current: T;
  }

  /**
   * Get the state context from component tree
   */
  export function getStateContext(): StateContext {
    const ctx = getContext<StateContext>(STATE_KEY);
    if (!ctx) {
      throw new Error("getStateContext must be called within a StateProvider");
    }
    return ctx;
  }

  /**
   * Convenience helper to read a value from the state context
   */
  export function getStateValue(path: string): CurrentValue<unknown> {
    const context = getStateContext();
    return {
      get current() {
        return context.get(path);
      },
      set current(value: unknown) {
        context.set(path, value);
      },
    };
  }

  /**
   * Two-way helper for `$bindState` / `$bindItem` bindings.
   * Mirrors `useBoundProp` from React packages.
   */
  export function getBoundProp<T>(
    propValue: () => T | undefined,
    bindingPath: () => string | undefined,
  ): CurrentValue<T | undefined> {
    const context = getStateContext();
    return {
      get current() {
        return propValue();
      },
      set current(value: T | undefined) {
        const path = bindingPath();
        if (path) {
          context.set(path, value);
        }
      },
    };
  }
</script>

<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import {
    createStateStore,
    getByPath,
    type StateModel as CoreStateModel,
    type StateStore as CoreStateStore,
  } from "@json-render/core";
  import { flattenToPointers } from "@json-render/core/store-utils";

  interface Props {
    store?: CoreStateStore;
    initialState?: CoreStateModel;
    onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
    children?: Snippet;
  }

  let { store, initialState = {}, onStateChange, children }: Props = $props();

  // svelte-ignore state_referenced_locally
  const internalStore = createStateStore(initialState);

  function activeStore(): CoreStateStore {
    return store ?? internalStore;
  }

  // Keep a reactive copy of the current store snapshot.
  let model: CoreStateModel = $state.raw(activeStore().getSnapshot());

  $effect(() => {
    const currentStore = activeStore();
    model = currentStore.getSnapshot();
    const unsubscribe = currentStore.subscribe(() => {
      model = currentStore.getSnapshot();
    });
    return unsubscribe;
  });

  // In uncontrolled mode, support reactive initialState updates.
  // svelte-ignore state_referenced_locally
  let prevFlat: Record<string, unknown> =
    initialState && Object.keys(initialState).length > 0
      ? flattenToPointers(initialState)
      : {};
  $effect(() => {
    if (store) return;
    const nextInitialState = initialState ?? {};
    const nextFlat =
      Object.keys(nextInitialState).length > 0
        ? flattenToPointers(nextInitialState)
        : {};
    const allKeys = new Set([
      ...Object.keys(prevFlat),
      ...Object.keys(nextFlat),
    ]);
    const updates: Record<string, unknown> = {};
    for (const key of allKeys) {
      if (prevFlat[key] !== nextFlat[key]) {
        updates[key] = key in nextFlat ? nextFlat[key] : undefined;
      }
    }
    prevFlat = nextFlat;
    if (Object.keys(updates).length > 0) {
      internalStore.update(updates);
    }
  });

  const ctx: StateContext = {
    get state() {
      return model;
    },
    get: (path: string) => activeStore().get(path),
    getSnapshot: () => activeStore().getSnapshot(),
    set: (path: string, value: unknown) => {
      const currentStore = activeStore();
      const prev = currentStore.getSnapshot();
      currentStore.set(path, value);
      const next = currentStore.getSnapshot();
      model = next;
      if (!store && next !== prev) {
        onStateChange?.([{ path, value }]);
      }
    },
    update: (updates: Record<string, unknown>) => {
      const currentStore = activeStore();
      const prev = currentStore.getSnapshot();
      currentStore.update(updates);
      const next = currentStore.getSnapshot();
      model = next;
      if (!store && next !== prev) {
        const changes: Array<{ path: string; value: unknown }> = [];
        for (const [path, value] of Object.entries(updates)) {
          if (getByPath(prev, path) !== value) {
            changes.push({ path, value });
          }
        }
        if (changes.length > 0) {
          onStateChange?.(changes);
        }
      }
    },
  };

  setContext(STATE_KEY, ctx);
</script>

{@render children?.()}

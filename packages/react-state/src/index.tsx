"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getByPath,
  createStateStore,
  type StateModel,
  type StateStore,
} from "@json-render/core";
import { flattenToPointers } from "@json-render/core/store-utils";

/**
 * State context value
 */
export interface StateContextValue {
  /** The current state model */
  state: StateModel;
  /** Get a value by path */
  get: (path: string) => unknown;
  /** Set a value by path */
  set: (path: string, value: unknown) => void;
  /** Update multiple values at once */
  update: (updates: Record<string, unknown>) => void;
  /** Return the live state snapshot from the underlying store (not the React render snapshot). */
  getSnapshot: () => StateModel;
}

const StateContext = createContext<StateContextValue | null>(null);

/**
 * Props for StateProvider
 */
export interface StateProviderProps {
  /**
   * External store that owns the state. When provided, the provider operates
   * in **controlled mode** — `initialState` and `onStateChange` are ignored
   * and the store is the single source of truth.
   */
  store?: StateStore;
  /** Initial state model (used only in uncontrolled mode) */
  initialState?: StateModel;
  /**
   * Callback when state changes (used only in uncontrolled mode).
   * Called once per `set` or `update` with all changed entries.
   */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  children: ReactNode;
}

function computeInitialFlat(
  isControlled: boolean,
  initialState: StateModel,
): Record<string, unknown> | null {
  if (isControlled) return null;
  if (Object.keys(initialState).length === 0) return {};
  return flattenToPointers(initialState);
}

/**
 * Provider for state model context.
 *
 * Supports two modes:
 * - **Controlled**: pass a `store` prop (e.g. backed by Redux / Zustand).
 * - **Uncontrolled** (default): omit `store` and optionally pass
 *   `initialState` / `onStateChange`.
 */
export function StateProvider({
  store: externalStore,
  initialState = {},
  onStateChange,
  children,
}: StateProviderProps) {
  const internalStoreRef = useRef<StateStore | undefined>(undefined);
  if (!externalStore && !internalStoreRef.current) {
    internalStoreRef.current = createStateStore(initialState);
  }

  const store = externalStore ?? internalStoreRef.current!;

  // Refs for stable callback identity — callbacks never change regardless of
  // whether the consumer passes a new store / onStateChange reference.
  const storeRef = useRef(store);
  storeRef.current = store;

  const isControlledRef = useRef(!!externalStore);
  isControlledRef.current = !!externalStore;

  const initialModeRef = useRef(externalStore ? "controlled" : "uncontrolled");
  const modeWarnedRef = useRef(false);
  if (process.env.NODE_ENV !== "production") {
    const currentMode = externalStore ? "controlled" : "uncontrolled";
    if (currentMode !== initialModeRef.current && !modeWarnedRef.current) {
      modeWarnedRef.current = true;
      console.warn(
        `StateProvider: switching from ${initialModeRef.current} to ${currentMode} mode is not supported.`,
      );
    }
  }

  const prevInitialStateRef = useRef(initialState);
  const prevFlatRef = useRef<Record<string, unknown> | null>(
    computeInitialFlat(!!externalStore, initialState),
  );
  useEffect(() => {
    if (externalStore) return;
    if (initialState === prevInitialStateRef.current) return;
    prevInitialStateRef.current = initialState;
    const nextFlat =
      initialState && Object.keys(initialState).length > 0
        ? flattenToPointers(initialState)
        : {};
    const prevFlat = prevFlatRef.current ?? {};
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
    prevFlatRef.current = nextFlat;
    if (Object.keys(updates).length > 0) {
      store.update(updates);
    }
  }, [externalStore, initialState, store]);

  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot ?? store.getSnapshot,
  );

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const set = useCallback((path: string, value: unknown) => {
    const s = storeRef.current;
    const prev = s.getSnapshot();
    s.set(path, value);
    if (!isControlledRef.current && s.getSnapshot() !== prev) {
      onStateChangeRef.current?.([{ path, value }]);
    }
  }, []);

  const update = useCallback((updates: Record<string, unknown>) => {
    const s = storeRef.current;
    const prev = s.getSnapshot();
    s.update(updates);
    if (!isControlledRef.current && s.getSnapshot() !== prev) {
      const changes: Array<{ path: string; value: unknown }> = [];
      for (const [path, value] of Object.entries(updates)) {
        if (getByPath(prev, path) !== value) {
          changes.push({ path, value });
        }
      }
      if (changes.length > 0) {
        onStateChangeRef.current?.(changes);
      }
    }
  }, []);

  const get = useCallback((path: string) => storeRef.current.get(path), []);

  const getSnapshot = useCallback(() => storeRef.current.getSnapshot(), []);

  const value = useMemo<StateContextValue>(
    () => ({ state, get, set, update, getSnapshot }),
    [state, get, set, update, getSnapshot],
  );

  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}

/**
 * Hook to access the state context
 */
export function useStateStore(): StateContextValue {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error("useStateStore must be used within a StateProvider");
  }
  return ctx;
}

/**
 * Hook to get a value from the state model
 */
export function useStateValue<T>(path: string): T | undefined {
  const { state } = useStateStore();
  return getByPath(state, path) as T | undefined;
}

/**
 * Hook to get and set a value from the state model (like useState).
 *
 * @deprecated Use {@link useBoundProp} with `$bindState` expressions instead.
 * `useStateBinding` takes a raw state path string, while `useBoundProp` works
 * with the renderer's `bindings` map and supports both `$bindState` and
 * `$bindItem` expressions.
 */
export function useStateBinding<T>(
  path: string,
): [T | undefined, (value: T) => void] {
  const { state, set } = useStateStore();
  const value = getByPath(state, path) as T | undefined;
  const setValue = useCallback(
    (newValue: T) => set(path, newValue),
    [path, set],
  );
  return [value, setValue];
}

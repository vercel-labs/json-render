import {
  getByPath,
  parseJsonPointer,
  type StateModel,
  type StateStore,
} from "./types";

/**
 * Immutably set a value at a JSON Pointer path using structural sharing.
 * Only objects along the path are shallow-cloned; untouched branches keep
 * their original references.
 */
export function immutableSetByPath(
  root: StateModel,
  path: string,
  value: unknown,
): StateModel {
  const segments = parseJsonPointer(path);
  if (segments.length === 0) return root;

  const result = { ...root };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const child = current[seg];
    if (Array.isArray(child)) {
      current[seg] = [...child];
    } else if (child !== null && typeof child === "object") {
      current[seg] = { ...(child as Record<string, unknown>) };
    } else {
      const nextSeg = segments[i + 1];
      current[seg] = nextSeg !== undefined && /^\d+$/.test(nextSeg) ? [] : {};
    }
    current = current[seg] as Record<string, unknown>;
  }

  const lastSeg = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    if (lastSeg === "-") {
      (current as unknown[]).push(value);
    } else {
      (current as unknown[])[parseInt(lastSeg, 10)] = value;
    }
  } else {
    current[lastSeg] = value;
  }

  return result;
}

/**
 * Create a simple in-memory {@link StateStore}.
 *
 * This is the default store used by `StateProvider` when no external store is
 * provided. It mirrors the previous `useState`-based behaviour but is
 * framework-agnostic so it can also be used in tests or non-React contexts.
 */
export function createStateStore(initialState: StateModel = {}): StateStore {
  let state: StateModel = { ...initialState };
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    get(path: string): unknown {
      return getByPath(state, path);
    },

    set(path: string, value: unknown): void {
      if (getByPath(state, path) === value) return;
      state = immutableSetByPath(state, path, value);
      notify();
    },

    update(updates: Record<string, unknown>): void {
      let changed = false;
      let next = state;
      for (const [path, value] of Object.entries(updates)) {
        if (getByPath(next, path) !== value) {
          next = immutableSetByPath(next, path, value);
          changed = true;
        }
      }
      if (!changed) return;
      state = next;
      notify();
    },

    getSnapshot(): StateModel {
      return state;
    },

    getServerSnapshot(): StateModel {
      return state;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Configuration for {@link createStoreAdapter}. Adapter authors supply these
 * three callbacks; everything else (get, set, update, no-op detection,
 * getServerSnapshot) is handled by the returned {@link StateStore}.
 */
export interface StoreAdapterConfig {
  /** Return the current state snapshot from the underlying store. */
  getSnapshot: () => StateModel;
  /** Write a new state snapshot to the underlying store. */
  setSnapshot: (next: StateModel) => void;
  /** Subscribe to changes in the underlying store. Return an unsubscribe fn. */
  subscribe: (listener: () => void) => () => void;
}

/**
 * Build a full {@link StateStore} from a minimal adapter config.
 *
 * Handles `get`, `set` (with no-op detection), `update` (batched, with no-op
 * detection), `getSnapshot`, `getServerSnapshot`, and `subscribe` -- so each
 * adapter only needs to wire its snapshot source, write API, and subscribe
 * mechanism.
 */
export function createStoreAdapter(config: StoreAdapterConfig): StateStore {
  return {
    get(path: string): unknown {
      return getByPath(config.getSnapshot(), path);
    },

    set(path: string, value: unknown): void {
      const current = config.getSnapshot();
      if (getByPath(current, path) === value) return;
      config.setSnapshot(immutableSetByPath(current, path, value));
    },

    update(updates: Record<string, unknown>): void {
      let next = config.getSnapshot();
      let changed = false;
      for (const [path, value] of Object.entries(updates)) {
        if (getByPath(next, path) !== value) {
          next = immutableSetByPath(next, path, value);
          changed = true;
        }
      }
      if (!changed) return;
      config.setSnapshot(next);
    },

    getSnapshot: config.getSnapshot,

    getServerSnapshot: config.getSnapshot,

    subscribe: config.subscribe,
  };
}

const MAX_FLATTEN_DEPTH = 20;

/**
 * Recursively flatten a plain object into a `Record<string, unknown>` keyed by
 * JSON Pointer paths. Only leaf values (non-plain-object) appear in the output.
 *
 * Includes circular reference protection and a depth cap to prevent stack
 * overflow on pathological inputs.
 *
 * ```ts
 * flattenToPointers({ user: { name: "Alice" }, count: 1 })
 * // => { "/user/name": "Alice", "/count": 1 }
 * ```
 */
export function flattenToPointers(
  obj: Record<string, unknown>,
  prefix = "",
  _depth = 0,
  _seen?: Set<object>,
  _warned?: { current: boolean },
): Record<string, unknown> {
  const seen = _seen ?? new Set<object>();
  const warned = _warned ?? { current: false };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const pointer = `${prefix}/${key}`;
    if (
      _depth < MAX_FLATTEN_DEPTH &&
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype &&
      !seen.has(value)
    ) {
      seen.add(value);
      Object.assign(
        result,
        flattenToPointers(
          value as Record<string, unknown>,
          pointer,
          _depth + 1,
          seen,
          warned,
        ),
      );
    } else {
      if (
        process.env.NODE_ENV !== "production" &&
        !warned.current &&
        _depth >= MAX_FLATTEN_DEPTH &&
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype &&
        !seen.has(value as object)
      ) {
        warned.current = true;
        console.warn(
          `flattenToPointers: depth limit (${MAX_FLATTEN_DEPTH}) reached. Nested state beyond this depth will be treated as a leaf value.`,
        );
      }
      result[pointer] = value;
    }
  }
  return result;
}

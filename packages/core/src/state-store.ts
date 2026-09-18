import {
  getByPath,
  isSafeJsonPointerPath,
  parseJsonPointer,
  type StateModel,
  type StateStore,
} from "./types";
import { parseArrayIndex } from "./path-utils";

function isContainer(
  value: unknown,
): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === "object";
}

function createMissingContainer(
  nextSegment: string,
  nextIsTerminal: boolean,
): Record<string, unknown> | unknown[] {
  return parseArrayIndex(nextSegment) !== undefined ||
    (nextIsTerminal && nextSegment === "-")
    ? []
    : {};
}

/**
 * Validate a path before cloning so rejected array tokens retain the original
 * snapshot reference and cannot create a partial branch.
 */
function canImmutableSetBySegments(
  root: StateModel,
  segments: string[],
): boolean {
  let current: unknown = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const nextSegment = segments[i + 1]!;
    const nextIsTerminal = i + 1 === segments.length - 1;

    if (Array.isArray(current)) {
      const index = parseArrayIndex(segment);
      if (index === undefined) return false;
      const child = current[index];
      current = isContainer(child)
        ? child
        : createMissingContainer(nextSegment, nextIsTerminal);
    } else if (isContainer(current)) {
      const object = current as Record<string, unknown>;
      const child = object[segment];
      current = isContainer(child)
        ? child
        : createMissingContainer(nextSegment, nextIsTerminal);
    } else {
      return false;
    }
  }

  if (Array.isArray(current)) {
    const lastSegment = segments[segments.length - 1]!;
    return lastSegment === "-" || parseArrayIndex(lastSegment) !== undefined;
  }

  return isContainer(current);
}

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
  if (!isSafeJsonPointerPath(path)) return root;

  const segments = parseJsonPointer(path);
  if (segments.length === 0) return root;
  if (!canImmutableSetBySegments(root, segments)) return root;

  const result = { ...root };
  let current: Record<string, unknown> | unknown[] = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const nextSegment = segments[i + 1]!;
    const nextIsTerminal = i + 1 === segments.length - 1;

    if (Array.isArray(current)) {
      const index = parseArrayIndex(seg)!;
      const child = current[index];
      current[index] = Array.isArray(child)
        ? [...child]
        : isContainer(child)
          ? { ...child }
          : createMissingContainer(nextSegment, nextIsTerminal);
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      const object = current as Record<string, unknown>;
      const child = object[seg];
      object[seg] = Array.isArray(child)
        ? [...child]
        : isContainer(child)
          ? { ...child }
          : createMissingContainer(nextSegment, nextIsTerminal);
      current = object[seg] as Record<string, unknown> | unknown[];
    }
  }

  const lastSeg = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    if (lastSeg === "-") {
      current.push(value);
    } else {
      current[parseArrayIndex(lastSeg)!] = value;
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
      if (!isSafeJsonPointerPath(path)) return;
      if (getByPath(state, path) === value) return;
      const next = immutableSetByPath(state, path, value);
      if (next === state) return;
      state = next;
      notify();
    },

    update(updates: Record<string, unknown>): void {
      let changed = false;
      let next = state;
      for (const [path, value] of Object.entries(updates)) {
        if (!isSafeJsonPointerPath(path)) continue;
        if (getByPath(next, path) !== value) {
          const updated = immutableSetByPath(next, path, value);
          if (updated !== next) {
            next = updated;
            changed = true;
          }
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
      if (!isSafeJsonPointerPath(path)) return;
      const current = config.getSnapshot();
      if (getByPath(current, path) === value) return;
      const next = immutableSetByPath(current, path, value);
      if (next === current) return;
      config.setSnapshot(next);
    },

    update(updates: Record<string, unknown>): void {
      let next = config.getSnapshot();
      let changed = false;
      for (const [path, value] of Object.entries(updates)) {
        if (!isSafeJsonPointerPath(path)) continue;
        if (getByPath(next, path) !== value) {
          const updated = immutableSetByPath(next, path, value);
          if (updated !== next) {
            next = updated;
            changed = true;
          }
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

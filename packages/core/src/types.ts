import { z } from "zod";
import type { ActionBinding } from "./actions";

/**
 * Dynamic value - can be a literal or a `{ $state }` reference to the state model.
 *
 * Used in action params and validation args where values can either be
 * hardcoded or resolved from state at runtime.
 */
export type DynamicValue<T = unknown> = T | { $state: string };

/**
 * Dynamic string value
 */
export type DynamicString = DynamicValue<string>;

/**
 * Dynamic number value
 */
export type DynamicNumber = DynamicValue<number>;

/**
 * Dynamic boolean value
 */
export type DynamicBoolean = DynamicValue<boolean>;

/**
 * Zod schema for dynamic values
 */
export const DynamicValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.object({ $state: z.string() }),
]);

export const DynamicStringSchema = z.union([
  z.string(),
  z.object({ $state: z.string() }),
]);

export const DynamicNumberSchema = z.union([
  z.number(),
  z.object({ $state: z.string() }),
]);

export const DynamicBooleanSchema = z.union([
  z.boolean(),
  z.object({ $state: z.string() }),
]);

/**
 * Base UI element structure for v2
 */
export interface UIElement<
  T extends string = string,
  P = Record<string, unknown>,
> {
  /** Component type from the catalog */
  type: T;
  /** Component props */
  props: P;
  /** Child element keys (flat structure) */
  children?: string[];
  /** Visibility condition */
  visible?: VisibilityCondition;
  /** Event bindings — maps event names to action bindings */
  on?: Record<string, ActionBinding | ActionBinding[]>;
  /** Repeat children once per item in a state array */
  repeat?: { statePath: string; key?: string };
  /**
   * State watchers — maps JSON Pointer state paths to action bindings.
   * When the value at a watched path changes, the bound actions fire.
   * Useful for cascading dependencies (e.g. country → city option loading).
   */
  watch?: Record<string, ActionBinding | ActionBinding[]>;
}

/**
 * Element with key and parentKey for use with flatToTree.
 * When elements are in an array (not a keyed map), key and parentKey
 * are needed to establish identity and parent-child relationships.
 */
export interface FlatElement<
  T extends string = string,
  P = Record<string, unknown>,
> extends UIElement<T, P> {
  /** Unique key identifying this element */
  key: string;
  /** Parent element key (null for root) */
  parentKey?: string | null;
}

/**
 * Shared comparison operators for visibility conditions.
 *
 * Use at most ONE comparison operator per condition. If multiple are
 * provided, only the first matching one is evaluated (precedence:
 * eq > neq > gt > gte > lt > lte). With no operator, truthiness is checked.
 *
 * `not` inverts the final result of whichever operator (or truthiness
 * check) is used.
 */
type ComparisonOperators = {
  eq?: unknown;
  neq?: unknown;
  gt?: number | { $state: string };
  gte?: number | { $state: string };
  lt?: number | { $state: string };
  lte?: number | { $state: string };
  not?: true;
};

/**
 * A single state-based condition.
 * Resolves `$state` to a value from the state model, then applies the operator.
 * Without an operator, checks truthiness.
 *
 * When `not` is `true`, the result of the entire condition is inverted.
 * For example `{ $state: "/count", gt: 5, not: true }` means "NOT greater than 5".
 */
export type StateCondition = { $state: string } & ComparisonOperators;

/**
 * A condition that resolves `$item` to a field on the current repeat item.
 * Only meaningful inside a `repeat` scope.
 *
 * Use `""` to reference the whole item, or `"field"` for a specific field.
 */
export type ItemCondition = { $item: string } & ComparisonOperators;

/**
 * A condition that resolves `$index` to the current repeat array index.
 * Only meaningful inside a `repeat` scope.
 */
export type IndexCondition = { $index: true } & ComparisonOperators;

/** A single visibility condition (state, item, or index). */
export type SingleCondition = StateCondition | ItemCondition | IndexCondition;

/**
 * AND wrapper — all child conditions must be true.
 * This is the explicit form of the implicit array AND (`SingleCondition[]`).
 * Unlike the implicit form, `$and` supports nested `$or` and `$and` conditions.
 */
export type AndCondition = { $and: VisibilityCondition[] };

/**
 * OR wrapper — at least one child condition must be true.
 */
export type OrCondition = { $or: VisibilityCondition[] };

/**
 * Visibility condition types.
 * - `boolean` — always/never
 * - `SingleCondition` — single condition (`$state`, `$item`, or `$index`)
 * - `SingleCondition[]` — implicit AND (all must be true)
 * - `AndCondition` — `{ $and: [...] }`, explicit AND (all must be true)
 * - `OrCondition` — `{ $or: [...] }`, at least one must be true
 */
export type VisibilityCondition =
  | boolean
  | SingleCondition
  | SingleCondition[]
  | AndCondition
  | OrCondition;

/**
 * Flat UI tree structure (optimized for LLM generation)
 */
export interface Spec {
  /** Root element key */
  root: string;
  /** Flat map of elements by key */
  elements: Record<string, UIElement>;
  /** Optional initial state to seed the state model.
   *  Components using statePath will read from / write to this state. */
  state?: Record<string, unknown>;
}

/**
 * State model type
 */
export type StateModel = Record<string, unknown>;

/**
 * An abstract store that owns state and notifies subscribers on change.
 *
 * Consumers can supply their own implementation (backed by Redux, Zustand,
 * XState, etc.) or use the built-in {@link createStateStore} for a simple
 * in-memory store.
 */
export interface StateStore {
  /** Read a value by JSON Pointer path. */
  get: (path: string) => unknown;
  /**
   * Write a value by JSON Pointer path and notify subscribers.
   * Equality is checked by reference (`===`), not deep comparison.
   * Callers must pass a new object/array reference for changes to be detected.
   */
  set: (path: string, value: unknown) => void;
  /**
   * Write multiple values at once and notify subscribers (single notification).
   * Each value is compared by reference (`===`); only paths whose value
   * actually changed are applied.
   */
  update: (updates: Record<string, unknown>) => void;
  /** Return the full state object (used by `useSyncExternalStore`). */
  getSnapshot: () => StateModel;
  /** Optional server snapshot for SSR (passed to `useSyncExternalStore`). Falls back to `getSnapshot` when omitted. */
  getServerSnapshot?: () => StateModel;
  /** Register a listener that is called on every state change. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
}

/**
 * Component schema definition using Zod
 */
export type ComponentSchema = z.ZodType<Record<string, unknown>>;

/**
 * Validation mode for catalog validation
 */
export type ValidationMode = "strict" | "warn" | "ignore";

/**
 * JSON patch operation types (RFC 6902)
 */
export type PatchOp = "add" | "remove" | "replace" | "move" | "copy" | "test";

/**
 * JSON patch operation (RFC 6902)
 */
export interface JsonPatch {
  op: PatchOp;
  path: string;
  /** Required for add, replace, test */
  value?: unknown;
  /** Required for move, copy (source location) */
  from?: string;
}

/**
 * Resolve a dynamic value against a state model
 */
export function resolveDynamicValue<T>(
  value: DynamicValue<T>,
  stateModel: StateModel,
): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "object" && "$state" in value) {
    return getByPath(stateModel, (value as { $state: string }).$state) as
      | T
      | undefined;
  }

  return value as T;
}

/**
 * Unescape a JSON Pointer token per RFC 6901 Section 4.
 * ~1 is decoded to / and ~0 is decoded to ~ (order matters).
 */
function unescapeJsonPointer(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * Parse a JSON Pointer path into unescaped segments.
 */
export function parseJsonPointer(path: string): string[] {
  const raw = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  return raw.map(unescapeJsonPointer);
}

/**
 * Get a value from an object by JSON Pointer path (RFC 6901)
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === "/") {
    return obj;
  }

  const segments = parseJsonPointer(path);

  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      current = current[index];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Check if a string is a numeric index
 */
function isNumericIndex(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * Set a value in an object by JSON Pointer path (RFC 6901).
 * Automatically creates arrays when the path segment is a numeric index.
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = parseJsonPointer(path);

  if (segments.length === 0) return;

  let current: Record<string, unknown> | unknown[] = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const nextSegment = segments[i + 1];
    const nextIsNumeric =
      nextSegment !== undefined &&
      (isNumericIndex(nextSegment) || nextSegment === "-");

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (current[index] === undefined || typeof current[index] !== "object") {
        current[index] = nextIsNumeric ? [] : {};
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      if (!(segment in current) || typeof current[segment] !== "object") {
        current[segment] = nextIsNumeric ? [] : {};
      }
      current = current[segment] as Record<string, unknown> | unknown[];
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    if (lastSegment === "-") {
      current.push(value);
    } else {
      const index = parseInt(lastSegment, 10);
      current[index] = value;
    }
  } else {
    current[lastSegment] = value;
  }
}

/**
 * Add a value per RFC 6902 "add" semantics.
 * For objects: create-or-replace the member.
 * For arrays: insert before the given index, or append if "-".
 */
export function addByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = parseJsonPointer(path);

  if (segments.length === 0) return;

  let current: Record<string, unknown> | unknown[] = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const nextSegment = segments[i + 1];
    const nextIsNumeric =
      nextSegment !== undefined &&
      (isNumericIndex(nextSegment) || nextSegment === "-");

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (current[index] === undefined || typeof current[index] !== "object") {
        current[index] = nextIsNumeric ? [] : {};
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      if (!(segment in current) || typeof current[segment] !== "object") {
        current[segment] = nextIsNumeric ? [] : {};
      }
      current = current[segment] as Record<string, unknown> | unknown[];
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    if (lastSegment === "-") {
      current.push(value);
    } else {
      const index = parseInt(lastSegment, 10);
      current.splice(index, 0, value);
    }
  } else {
    current[lastSegment] = value;
  }
}

/**
 * Remove a value per RFC 6902 "remove" semantics.
 * For objects: delete the property.
 * For arrays: splice out the element at the given index.
 */
export function removeByPath(obj: Record<string, unknown>, path: string): void {
  const segments = parseJsonPointer(path);

  if (segments.length === 0) return;

  let current: Record<string, unknown> | unknown[] = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (current[index] === undefined || typeof current[index] !== "object") {
        return; // path does not exist
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      if (!(segment in current) || typeof current[segment] !== "object") {
        return; // path does not exist
      }
      current = current[segment] as Record<string, unknown> | unknown[];
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    const index = parseInt(lastSegment, 10);
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
    }
  } else {
    delete current[lastSegment];
  }
}

/**
 * Deep equality check for RFC 6902 "test" operation.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

/**
 * Find a form value from params and/or state.
 * Useful in action handlers to locate form input values regardless of path format.
 *
 * Checks in order:
 * 1. Direct param key (if not a path reference)
 * 2. Param keys ending with the field name
 * 3. State keys ending with the field name (dot notation)
 * 4. State path using getByPath (slash notation)
 *
 * @example
 * // Find "name" from params or state
 * const name = findFormValue("name", params, state);
 *
 * // Will find from: params.name, params["form.name"], state["form.name"], or getByPath(state, "name")
 */
export function findFormValue(
  fieldName: string,
  params?: Record<string, unknown>,
  state?: Record<string, unknown>,
): unknown {
  // Check params first (but not if it looks like a state path reference)
  if (params?.[fieldName] !== undefined) {
    const val = params[fieldName];
    // If the value looks like a path reference (contains dots), skip it
    if (typeof val !== "string" || !val.includes(".")) {
      return val;
    }
  }

  // Check param keys that end with the field name
  if (params) {
    for (const key of Object.keys(params)) {
      if (key.endsWith(`.${fieldName}`)) {
        const val = params[key];
        if (typeof val !== "string" || !val.includes(".")) {
          return val;
        }
      }
    }
  }

  // Check state keys that end with the field name (handles any form naming)
  if (state) {
    for (const key of Object.keys(state)) {
      if (key === fieldName || key.endsWith(`.${fieldName}`)) {
        return state[key];
      }
    }

    // Try getByPath with the raw field name
    const val = getByPath(state, fieldName);
    if (val !== undefined) {
      return val;
    }
  }

  return undefined;
}

// =============================================================================
// SpecStream - Streaming format for progressively building specs
// =============================================================================

/**
 * A SpecStream line - a single patch operation in the stream.
 */
export type SpecStreamLine = JsonPatch;

/**
 * Parse a single SpecStream line into a patch operation.
 * Returns null if the line is invalid or empty.
 *
 * SpecStream is json-render's streaming format where each line is a JSON patch
 * operation that progressively builds up the final spec.
 */
export function parseSpecStreamLine(line: string): SpecStreamLine | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("{")) return null;

  try {
    const patch = JSON.parse(trimmed) as SpecStreamLine;
    if (patch.op && patch.path !== undefined) {
      return patch;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Apply a single RFC 6902 JSON Patch operation to an object.
 * Mutates the object in place.
 *
 * Supports all six RFC 6902 operations: add, remove, replace, move, copy, test.
 *
 * @throws {Error} If a "test" operation fails (value mismatch).
 */
export function applySpecStreamPatch<T extends Record<string, unknown>>(
  obj: T,
  patch: SpecStreamLine,
): T {
  switch (patch.op) {
    case "add":
      addByPath(obj, patch.path, patch.value);
      break;
    case "replace":
      // RFC 6902: target must exist. For streaming tolerance we set regardless.
      setByPath(obj, patch.path, patch.value);
      break;
    case "remove":
      removeByPath(obj, patch.path);
      break;
    case "move": {
      if (!patch.from) break;
      const moveValue = getByPath(obj, patch.from);
      removeByPath(obj, patch.from);
      addByPath(obj, patch.path, moveValue);
      break;
    }
    case "copy": {
      if (!patch.from) break;
      const copyValue = getByPath(obj, patch.from);
      addByPath(obj, patch.path, copyValue);
      break;
    }
    case "test": {
      const actual = getByPath(obj, patch.path);
      if (!deepEqual(actual, patch.value)) {
        throw new Error(
          `Test operation failed: value at "${patch.path}" does not match`,
        );
      }
      break;
    }
  }
  return obj;
}

/**
 * Apply a single RFC 6902 JSON Patch operation to a Spec.
 * Mutates the spec in place and returns it.
 *
 * This is a typed convenience wrapper around `applySpecStreamPatch` that
 * accepts a `Spec` directly without requiring a cast to `Record<string, unknown>`.
 *
 * Note: This mutates the spec. For React state updates, spread the result
 * to create a new reference: `setSpec({ ...applySpecPatch(spec, patch) })`.
 *
 * @example
 * let spec: Spec = { root: "", elements: {} };
 * applySpecPatch(spec, { op: "add", path: "/root", value: "main" });
 */
export function applySpecPatch(spec: Spec, patch: SpecStreamLine): Spec {
  applySpecStreamPatch(spec as unknown as Record<string, unknown>, patch);
  return spec;
}

// =============================================================================
// Nested-to-Flat Conversion
// =============================================================================

/**
 * A nested spec node. This is the tree format that humans naturally write —
 * each node has inline `children` as an array of child node objects rather
 * than string keys.
 */
interface NestedNode {
  type: string;
  props: Record<string, unknown>;
  children?: NestedNode[];
  /** Any other top-level fields (visible, on, repeat, etc.) */
  [key: string]: unknown;
}

/**
 * Convert a nested (tree-structured) spec into the flat `Spec` format used
 * by json-render renderers.
 *
 * In the nested format each node has inline `children` as an array of child
 * objects. This function walks the tree, assigns auto-generated keys
 * (`el-0`, `el-1`, ...), and produces a flat `{ root, elements, state }` spec.
 *
 * The top-level `state` field (if present on the root node) is hoisted to
 * `spec.state`.
 *
 * @example
 * ```ts
 * const nested = {
 *   type: "Card",
 *   props: { title: "Hello" },
 *   children: [
 *     { type: "Text", props: { content: "World" } },
 *   ],
 *   state: { count: 0 },
 * };
 * const spec = nestedToFlat(nested);
 * // {
 * //   root: "el-0",
 * //   elements: {
 * //     "el-0": { type: "Card", props: { title: "Hello" }, children: ["el-1"] },
 * //     "el-1": { type: "Text", props: { content: "World" }, children: [] },
 * //   },
 * //   state: { count: 0 },
 * // }
 * ```
 */
export function nestedToFlat(nested: Record<string, unknown>): Spec {
  const elements: Record<string, UIElement> = {};
  let counter = 0;

  function walk(node: Record<string, unknown>): string {
    const key = `el-${counter++}`;
    const { type, props, children: rawChildren, ...rest } = node as NestedNode;

    // Recursively flatten children
    const childKeys: string[] = [];
    if (Array.isArray(rawChildren)) {
      for (const child of rawChildren) {
        if (child && typeof child === "object" && "type" in child) {
          childKeys.push(walk(child as Record<string, unknown>));
        }
      }
    }

    // Build the flat element, preserving extra fields (visible, on, repeat, etc.)
    // but excluding `state` which is hoisted to spec-level.
    const element: UIElement = {
      type: type ?? "unknown",
      props: (props as Record<string, unknown>) ?? {},
      children: childKeys,
    };

    // Copy extra fields (visible, on, repeat) but not state
    for (const [k, v] of Object.entries(rest)) {
      if (k !== "state" && v !== undefined) {
        (element as unknown as Record<string, unknown>)[k] = v;
      }
    }

    elements[key] = element;
    return key;
  }

  const root = walk(nested);

  const spec: Spec = { root, elements };

  // Hoist state from root node if present
  if (
    nested.state &&
    typeof nested.state === "object" &&
    !Array.isArray(nested.state)
  ) {
    spec.state = nested.state as Record<string, unknown>;
  }

  return spec;
}

/**
 * Compile a SpecStream string into a JSON object.
 * Each line should be a patch operation.
 *
 * @example
 * const stream = `{"op":"add","path":"/name","value":"Alice"}
 * {"op":"add","path":"/age","value":30}`;
 * const result = compileSpecStream(stream);
 * // { name: "Alice", age: 30 }
 */
export function compileSpecStream<
  T extends Record<string, unknown> = Record<string, unknown>,
>(stream: string, initial: T = {} as T): T {
  const lines = stream.split("\n");
  const result = { ...initial };

  for (const line of lines) {
    const patch = parseSpecStreamLine(line);
    if (patch) {
      applySpecStreamPatch(result, patch);
    }
  }

  return result as T;
}

/**
 * Streaming SpecStream compiler.
 * Useful for processing SpecStream data as it streams in from AI.
 *
 * @example
 * const compiler = createSpecStreamCompiler<MySpec>();
 *
 * // As chunks arrive:
 * const { result, newPatches } = compiler.push(chunk);
 * if (newPatches.length > 0) {
 *   updateUI(result);
 * }
 *
 * // When done:
 * const finalResult = compiler.getResult();
 */
export interface SpecStreamCompiler<T> {
  /** Push a chunk of text. Returns the current result and any new patches applied. */
  push(chunk: string): { result: T; newPatches: SpecStreamLine[] };
  /** Get the current compiled result */
  getResult(): T;
  /** Get all patches that have been applied */
  getPatches(): SpecStreamLine[];
  /** Reset the compiler to initial state */
  reset(initial?: Partial<T>): void;
}

/**
 * Create a streaming SpecStream compiler.
 *
 * SpecStream is json-render's streaming format. AI outputs patch operations
 * line by line, and this compiler progressively builds the final spec.
 *
 * @example
 * const compiler = createSpecStreamCompiler<TimelineSpec>();
 *
 * // Process streaming response
 * const reader = response.body.getReader();
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *
 *   const { result, newPatches } = compiler.push(decoder.decode(value));
 *   if (newPatches.length > 0) {
 *     setSpec(result); // Update UI with partial result
 *   }
 * }
 */
export function createSpecStreamCompiler<T = Record<string, unknown>>(
  initial: Partial<T> = {},
): SpecStreamCompiler<T> {
  let result = { ...initial } as T;
  let buffer = "";
  const appliedPatches: SpecStreamLine[] = [];
  const processedLines = new Set<string>();

  return {
    push(chunk: string): { result: T; newPatches: SpecStreamLine[] } {
      buffer += chunk;
      const newPatches: SpecStreamLine[] = [];

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || processedLines.has(trimmed)) continue;
        processedLines.add(trimmed);

        const patch = parseSpecStreamLine(trimmed);
        if (patch) {
          applySpecStreamPatch(result as Record<string, unknown>, patch);
          appliedPatches.push(patch);
          newPatches.push(patch);
        }
      }

      // Return a shallow copy to trigger re-renders
      if (newPatches.length > 0) {
        result = { ...result };
      }

      return { result, newPatches };
    },

    getResult(): T {
      // Process any remaining buffer
      if (buffer.trim()) {
        const patch = parseSpecStreamLine(buffer);
        if (patch && !processedLines.has(buffer.trim())) {
          processedLines.add(buffer.trim());
          applySpecStreamPatch(result as Record<string, unknown>, patch);
          appliedPatches.push(patch);
          result = { ...result };
        }
        buffer = "";
      }
      return result;
    },

    getPatches(): SpecStreamLine[] {
      return [...appliedPatches];
    },

    reset(newInitial: Partial<T> = {}): void {
      result = { ...newInitial } as T;
      buffer = "";
      appliedPatches.length = 0;
      processedLines.clear();
    },
  };
}

// =============================================================================
// Mixed Stream Parser — for chat + GenUI (text interleaved with JSONL patches)
// =============================================================================

/**
 * Callbacks for the mixed stream parser.
 */
export interface MixedStreamCallbacks {
  /** Called when a JSONL patch line is parsed */
  onPatch: (patch: SpecStreamLine) => void;
  /** Called when a text (non-JSONL) line is received */
  onText: (text: string) => void;
}

/**
 * A stateful parser for mixed streams that contain both text and JSONL patches.
 * Used in chat + GenUI scenarios where an LLM responds with conversational text
 * interleaved with json-render JSONL patch operations.
 */
export interface MixedStreamParser {
  /** Push a chunk of streamed data. Calls onPatch/onText for each complete line. */
  push(chunk: string): void;
  /** Flush any remaining buffered content. Call when the stream ends. */
  flush(): void;
}

/**
 * Create a parser for mixed text + JSONL streams.
 *
 * In chat + GenUI scenarios, an LLM streams a response that contains both
 * conversational text and json-render JSONL patch lines. This parser buffers
 * incoming chunks, splits them into lines, and classifies each line as either
 * a JSONL patch (via `parseSpecStreamLine`) or plain text.
 *
 * @example
 * const parser = createMixedStreamParser({
 *   onText: (text) => appendToMessage(text),
 *   onPatch: (patch) => applySpecPatch(spec, patch),
 * });
 *
 * // As chunks arrive from the stream:
 * for await (const chunk of stream) {
 *   parser.push(chunk);
 * }
 * parser.flush();
 */
export function createMixedStreamParser(
  callbacks: MixedStreamCallbacks,
): MixedStreamParser {
  let buffer = "";
  let inSpecFence = false;

  function processLine(line: string): void {
    const trimmed = line.trim();

    // Fence detection
    if (!inSpecFence && trimmed.startsWith("```spec")) {
      inSpecFence = true;
      return;
    }
    if (inSpecFence && trimmed === "```") {
      inSpecFence = false;
      return;
    }

    if (!trimmed) return;

    if (inSpecFence) {
      const patch = parseSpecStreamLine(trimmed);
      if (patch) {
        callbacks.onPatch(patch);
      }
      return;
    }

    // Outside fence: heuristic mode
    const patch = parseSpecStreamLine(trimmed);
    if (patch) {
      callbacks.onPatch(patch);
    } else {
      callbacks.onText(line);
    }
  }

  return {
    push(chunk: string): void {
      buffer += chunk;

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        processLine(line);
      }
    },

    flush(): void {
      if (buffer.trim()) {
        processLine(buffer);
      }
      buffer = "";
    },
  };
}

// =============================================================================
// AI SDK Stream Transform
// =============================================================================

/**
 * Minimal chunk shape compatible with the AI SDK's `UIMessageChunk`.
 *
 * Defined here so that `@json-render/core` has no dependency on the `ai`
 * package. The discriminated union covers the three text-related chunk types
 * the transform inspects; all other chunk types pass through via the fallback.
 */
export type StreamChunk =
  | { type: "text-start"; id: string; [k: string]: unknown }
  | { type: "text-delta"; id: string; delta: string; [k: string]: unknown }
  | { type: "text-end"; id: string; [k: string]: unknown }
  | { type: string; [k: string]: unknown };

/** The opening fence for a spec block (e.g. ` ```spec `). */
const SPEC_FENCE_OPEN = "```spec";
/** The closing fence for a spec block. */
const SPEC_FENCE_CLOSE = "```";

/**
 * Creates a `TransformStream` that intercepts AI SDK UI message stream chunks
 * and classifies text content as either prose or json-render JSONL patches.
 *
 * Two classification modes:
 *
 * 1. **Fence mode** (preferred): Lines between ` ```spec ` and ` ``` ` are
 *    parsed as JSONL patches. Fence delimiters are swallowed (not emitted).
 * 2. **Heuristic mode** (backward compat): Outside of fences, lines starting
 *    with `{` are buffered and tested with `parseSpecStreamLine`. Valid patches
 *    are emitted as {@link SPEC_DATA_PART_TYPE} parts; everything else is
 *    flushed as text.
 *
 * Non-text chunks (tool events, step markers, etc.) are passed through unchanged.
 *
 * @example
 * ```ts
 * import { createJsonRenderTransform } from "@json-render/core";
 * import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
 *
 * const stream = createUIMessageStream({
 *   execute: async ({ writer }) => {
 *     writer.merge(
 *       result.toUIMessageStream().pipeThrough(createJsonRenderTransform()),
 *     );
 *   },
 * });
 * return createUIMessageStreamResponse({ stream });
 * ```
 */
export function createJsonRenderTransform(): TransformStream<
  StreamChunk,
  StreamChunk
> {
  let lineBuffer = "";
  let currentTextId = "";
  // Whether the current incomplete line might be JSONL (starts with '{')
  let buffering = false;
  // Whether we are inside a ```spec fence
  let inSpecFence = false;
  // Whether we are currently inside a text block (between text-start/text-end).
  // Used to split text blocks around spec data so the AI SDK creates separate
  // text parts, preserving interleaving of prose and UI in message.parts.
  let inTextBlock = false;
  let textIdCounter = 0;

  /** Close the current text block if one is open. */
  function closeTextBlock(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    if (inTextBlock) {
      controller.enqueue({ type: "text-end", id: currentTextId });
      inTextBlock = false;
    }
  }

  /** Ensure a text block is open, starting a new one if needed. */
  function ensureTextBlock(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    if (!inTextBlock) {
      textIdCounter++;
      currentTextId = String(textIdCounter);
      controller.enqueue({ type: "text-start", id: currentTextId });
      inTextBlock = true;
    }
  }

  /** Emit a text-delta, opening a text block first if necessary. */
  function emitTextDelta(
    delta: string,
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    ensureTextBlock(controller);
    controller.enqueue({ type: "text-delta", id: currentTextId, delta });
  }

  function emitPatch(
    patch: SpecStreamLine,
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    closeTextBlock(controller);
    controller.enqueue({
      type: SPEC_DATA_PART_TYPE,
      data: { type: "patch", patch },
    });
  }

  function flushBuffer(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    if (!lineBuffer) return;

    const trimmed = lineBuffer.trim();

    // Inside a fence, everything is spec data
    if (inSpecFence) {
      if (trimmed) {
        const patch = parseSpecStreamLine(trimmed);
        if (patch) emitPatch(patch, controller);
        // Non-patch lines inside the fence are silently dropped
      }
      lineBuffer = "";
      buffering = false;
      return;
    }

    if (trimmed) {
      const patch = parseSpecStreamLine(trimmed);
      if (patch) {
        emitPatch(patch, controller);
      } else {
        // Was buffered but isn't JSONL — flush as text
        emitTextDelta(lineBuffer, controller);
      }
    } else {
      // Whitespace-only buffer — forward as-is (preserves blank lines)
      emitTextDelta(lineBuffer, controller);
    }
    lineBuffer = "";
    buffering = false;
  }

  function processCompleteLine(
    line: string,
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    const trimmed = line.trim();

    // --- Fence detection ---
    if (!inSpecFence && trimmed.startsWith(SPEC_FENCE_OPEN)) {
      inSpecFence = true;
      return; // Swallow the opening fence
    }
    if (inSpecFence && trimmed === SPEC_FENCE_CLOSE) {
      inSpecFence = false;
      return; // Swallow the closing fence
    }

    // Inside a fence: parse as spec data
    if (inSpecFence) {
      if (trimmed) {
        const patch = parseSpecStreamLine(trimmed);
        if (patch) emitPatch(patch, controller);
      }
      return;
    }

    // --- Outside fence: heuristic mode ---
    if (!trimmed) {
      // Empty line — forward for markdown paragraph breaks
      emitTextDelta("\n", controller);
      return;
    }

    const patch = parseSpecStreamLine(trimmed);
    if (patch) {
      emitPatch(patch, controller);
    } else {
      emitTextDelta(line + "\n", controller);
    }
  }

  return new TransformStream<StreamChunk, StreamChunk>({
    transform(chunk, controller) {
      switch (chunk.type) {
        case "text-start": {
          const id = (chunk as { id: string }).id;
          const idNum = parseInt(id, 10);
          if (!isNaN(idNum) && idNum >= textIdCounter) {
            textIdCounter = idNum;
          }
          currentTextId = id;
          inTextBlock = true;
          controller.enqueue(chunk);
          break;
        }

        case "text-delta": {
          const delta = chunk as { id: string; delta: string };
          const text = delta.delta;

          for (let i = 0; i < text.length; i++) {
            const ch = text.charAt(i);

            if (ch === "\n") {
              // Line complete — classify and emit
              if (buffering) {
                processCompleteLine(lineBuffer, controller);
                lineBuffer = "";
                buffering = false;
              } else {
                // Outside fence, emit newline; inside fence, swallow it
                if (!inSpecFence) {
                  emitTextDelta("\n", controller);
                }
              }
            } else if (lineBuffer.length === 0 && !buffering) {
              // Start of a new line — decide whether to buffer or stream
              if (inSpecFence || ch === "{" || ch === "`") {
                // Buffer: inside fence (everything), or heuristic mode ({), or potential fence (`)
                buffering = true;
                lineBuffer += ch;
              } else {
                emitTextDelta(ch, controller);
              }
            } else if (buffering) {
              lineBuffer += ch;
            } else {
              emitTextDelta(ch, controller);
            }
          }
          break;
        }

        case "text-end": {
          flushBuffer(controller);
          if (inTextBlock) {
            controller.enqueue({ type: "text-end", id: currentTextId });
            inTextBlock = false;
          }
          break;
        }

        default: {
          controller.enqueue(chunk);
          break;
        }
      }
    },

    flush(controller) {
      flushBuffer(controller);
      closeTextBlock(controller);
    },
  });
}

/**
 * The key registered in `AppDataParts` for json-render specs.
 * The AI SDK automatically prefixes this with `"data-"` on the wire,
 * so the actual stream chunk type is `"data-spec"` (see {@link SPEC_DATA_PART_TYPE}).
 *
 * @example
 * ```ts
 * import { SPEC_DATA_PART, type SpecDataPart } from "@json-render/core";
 * type AppDataParts = { [SPEC_DATA_PART]: SpecDataPart };
 * ```
 */
export const SPEC_DATA_PART = "spec" as const;

/**
 * The wire-format type string as it appears in stream chunks and message parts.
 * This is `"data-"` + {@link SPEC_DATA_PART} — i.e. `"data-spec"`.
 *
 * Use this constant when filtering message parts or enqueuing stream chunks.
 */
export const SPEC_DATA_PART_TYPE = `data-${SPEC_DATA_PART}` as const;

/**
 * Discriminated union for the payload of a {@link SPEC_DATA_PART_TYPE} SSE part.
 *
 * - `"patch"`: A single RFC 6902 JSON Patch operation (streaming, progressive UI).
 * - `"flat"`: A complete flat spec with `root`, `elements`, and optional `state`.
 * - `"nested"`: A complete nested spec (tree structure — schema depends on catalog).
 */
export type SpecDataPart =
  | { type: "patch"; patch: JsonPatch }
  | { type: "flat"; spec: Spec }
  | { type: "nested"; spec: Record<string, unknown> };

/**
 * Convenience wrapper that pipes an AI SDK UI message stream through the
 * json-render transform, classifying text as prose or JSONL patches.
 *
 * Eliminates the need for manual `pipeThrough(createJsonRenderTransform())`
 * and the associated type cast.
 *
 * @example
 * ```ts
 * import { pipeJsonRender } from "@json-render/core";
 *
 * const stream = createUIMessageStream({
 *   execute: async ({ writer }) => {
 *     writer.merge(pipeJsonRender(result.toUIMessageStream()));
 *   },
 * });
 * return createUIMessageStreamResponse({ stream });
 * ```
 */
export function pipeJsonRender<T = StreamChunk>(
  stream: ReadableStream<T>,
): ReadableStream<T> {
  return stream.pipeThrough(
    createJsonRenderTransform() as unknown as TransformStream<T, T>,
  );
}

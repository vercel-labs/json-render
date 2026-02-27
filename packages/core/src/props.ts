import type { VisibilityCondition, StateModel } from "./types";
import { getByPath } from "./types";
import { evaluateVisibility, type VisibilityContext } from "./visibility";

// =============================================================================
// Prop Expression Types
// =============================================================================

/**
 * A prop expression that resolves to a value based on state.
 *
 * - `{ $state: string }` reads a value from the global state model
 * - `{ $item: string }` reads a field from the current repeat item
 *    (relative path into the item object; use `""` for the whole item)
 * - `{ $index: true }` returns the current repeat array index. Uses `true`
 *    as a sentinel flag because the index is a scalar with no sub-path to
 *    navigate — unlike `$item` which needs a path into the item object.
 * - `{ $bindState: string }` two-way binding to a global state path —
 *    resolves to the value at the path (like `$state`) AND exposes the
 *    resolved path so the component can write back.
 * - `{ $bindItem: string }` two-way binding to a field on the current
 *    repeat item — resolves via `repeatBasePath + path` and exposes the
 *    absolute state path for write-back.
 * - `{ $cond, $then, $else }` conditionally picks a value
 * - `{ $computed: string, args?: Record<string, PropExpression> }` calls a
 *    registered function with resolved args and returns the result
 * - `{ $template: string }` interpolates `${/path}` references in the
 *    string with values from the state model
 * - Any other value is a literal (passthrough)
 */
export type PropExpression<T = unknown> =
  | T
  | { $state: string }
  | { $item: string }
  | { $index: true }
  | { $bindState: string }
  | { $bindItem: string }
  | {
      $cond: VisibilityCondition;
      $then: PropExpression<T>;
      $else: PropExpression<T>;
    }
  | { $computed: string; args?: Record<string, unknown> }
  | { $template: string };

/**
 * Function signature for `$computed` expressions.
 * Receives a record of resolved argument values and returns a computed result.
 */
export type ComputedFunction = (args: Record<string, unknown>) => unknown;

/**
 * Context for resolving prop expressions.
 * Extends {@link VisibilityContext} with an optional `repeatBasePath` used
 * to resolve `$bindItem` paths to absolute state paths.
 */
export interface PropResolutionContext extends VisibilityContext {
  /** Absolute state path to the current repeat item (e.g. "/todos/0"). Set inside repeat scopes. */
  repeatBasePath?: string;
  /** Named functions available for `$computed` expressions. */
  functions?: Record<string, ComputedFunction>;
}

// =============================================================================
// Type Guards
// =============================================================================

function isStateExpression(value: unknown): value is { $state: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$state" in value &&
    typeof (value as Record<string, unknown>).$state === "string"
  );
}

function isItemExpression(value: unknown): value is { $item: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$item" in value &&
    typeof (value as Record<string, unknown>).$item === "string"
  );
}

function isIndexExpression(value: unknown): value is { $index: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$index" in value &&
    (value as Record<string, unknown>).$index === true
  );
}

function isBindStateExpression(
  value: unknown,
): value is { $bindState: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$bindState" in value &&
    typeof (value as Record<string, unknown>).$bindState === "string"
  );
}

function isBindItemExpression(value: unknown): value is { $bindItem: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$bindItem" in value &&
    typeof (value as Record<string, unknown>).$bindItem === "string"
  );
}

function isCondExpression(
  value: unknown,
): value is { $cond: VisibilityCondition; $then: unknown; $else: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$cond" in value &&
    "$then" in value &&
    "$else" in value
  );
}

function isComputedExpression(
  value: unknown,
): value is { $computed: string; args?: Record<string, unknown> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$computed" in value &&
    typeof (value as Record<string, unknown>).$computed === "string"
  );
}

function isTemplateExpression(value: unknown): value is { $template: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$template" in value &&
    typeof (value as Record<string, unknown>).$template === "string"
  );
}

// Module-level set to avoid spamming console.warn on every render for the same
// unknown $computed function name. Once the set reaches WARNED_COMPUTED_MAX,
// new names are no longer deduplicated (warnings still fire) but the set stops
// growing, preventing unbounded memory use in long-lived processes (e.g. SSR).
const WARNED_COMPUTED_MAX = 100;
const warnedComputedFns = new Set<string>();

/** @internal Test-only: clear the deduplication set for $computed warnings. */
export function _resetWarnedComputedFns(): void {
  warnedComputedFns.clear();
}

// Same deduplication pattern for $template paths that don't start with "/".
const WARNED_TEMPLATE_MAX = 100;
const warnedTemplatePaths = new Set<string>();

/** @internal Test-only: clear the deduplication set for $template warnings. */
export function _resetWarnedTemplatePaths(): void {
  warnedTemplatePaths.clear();
}

// =============================================================================
// Prop Expression Resolution
// =============================================================================

// =============================================================================
// $bindItem path resolution helper
// =============================================================================

/**
 * Resolve a `$bindItem` path into an absolute state path using the repeat
 * scope's base path.
 *
 * `""` resolves to `repeatBasePath` (the whole item).
 * `"field"` resolves to `repeatBasePath + "/field"`.
 *
 * Returns `undefined` when no `repeatBasePath` is available (i.e. `$bindItem`
 * is used outside a repeat scope).
 */
function resolveBindItemPath(
  itemPath: string,
  ctx: PropResolutionContext,
): string | undefined {
  if (ctx.repeatBasePath == null) {
    console.warn(`$bindItem used outside repeat scope: "${itemPath}"`);
    return undefined;
  }
  if (itemPath === "") return ctx.repeatBasePath;
  return ctx.repeatBasePath + "/" + itemPath;
}

// =============================================================================
// Prop Expression Resolution
// =============================================================================

/**
 * Resolve a single prop value that may contain expressions.
 * Handles $state, $item, $index, $bindState, $bindItem, and $cond/$then/$else in a single pass.
 */
export function resolvePropValue(
  value: unknown,
  ctx: PropResolutionContext,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // $state: read from global state model
  if (isStateExpression(value)) {
    return getByPath(ctx.stateModel, value.$state);
  }

  // $item: read from current repeat item
  if (isItemExpression(value)) {
    if (ctx.repeatItem === undefined) return undefined;
    // "" means the whole item, "field" means a field on the item
    return value.$item === ""
      ? ctx.repeatItem
      : getByPath(ctx.repeatItem, value.$item);
  }

  // $index: return current repeat array index
  if (isIndexExpression(value)) {
    return ctx.repeatIndex;
  }

  // $bindState: two-way binding to global state path
  if (isBindStateExpression(value)) {
    return getByPath(ctx.stateModel, value.$bindState);
  }

  // $bindItem: two-way binding to repeat item field
  if (isBindItemExpression(value)) {
    const resolvedPath = resolveBindItemPath(value.$bindItem, ctx);
    if (resolvedPath === undefined) return undefined;
    return getByPath(ctx.stateModel, resolvedPath);
  }

  // $cond/$then/$else: evaluate condition and pick branch
  if (isCondExpression(value)) {
    const result = evaluateVisibility(value.$cond, ctx);
    return resolvePropValue(result ? value.$then : value.$else, ctx);
  }

  // $computed: call a registered function with resolved args
  if (isComputedExpression(value)) {
    const fn = ctx.functions?.[value.$computed];
    if (!fn) {
      if (!warnedComputedFns.has(value.$computed)) {
        if (warnedComputedFns.size < WARNED_COMPUTED_MAX) {
          warnedComputedFns.add(value.$computed);
        }
        console.warn(`Unknown $computed function: "${value.$computed}"`);
      }
      return undefined;
    }
    const resolvedArgs: Record<string, unknown> = {};
    if (value.args) {
      for (const [key, arg] of Object.entries(value.args)) {
        resolvedArgs[key] = resolvePropValue(arg, ctx);
      }
    }
    return fn(resolvedArgs);
  }

  // $template: interpolate ${/path} references with state values
  if (isTemplateExpression(value)) {
    return value.$template.replace(
      /\$\{([^}]+)\}/g,
      (_match, rawPath: string) => {
        let path = rawPath;
        if (!path.startsWith("/")) {
          if (!warnedTemplatePaths.has(path)) {
            if (warnedTemplatePaths.size < WARNED_TEMPLATE_MAX) {
              warnedTemplatePaths.add(path);
            }
            console.warn(
              `$template path "${path}" should be a JSON Pointer starting with "/". Automatically resolving as "/${path}".`,
            );
          }
          path = "/" + path;
        }
        const resolved = getByPath(ctx.stateModel, path);
        return resolved != null ? String(resolved) : "";
      },
    );
  }

  // Arrays: resolve each element
  if (Array.isArray(value)) {
    return value.map((item) => resolvePropValue(item, ctx));
  }

  // Plain objects (not expressions): resolve each value recursively
  if (typeof value === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = resolvePropValue(val, ctx);
    }
    return resolved;
  }

  // Primitive literal: passthrough
  return value;
}

/**
 * Resolve all prop values in an element's props object.
 * Returns a new props object with all expressions resolved.
 */
export function resolveElementProps(
  props: Record<string, unknown>,
  ctx: PropResolutionContext,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    resolved[key] = resolvePropValue(value, ctx);
  }
  return resolved;
}

/**
 * Scan an element's raw props for `$bindState` / `$bindItem` expressions
 * and return a map of prop name → resolved absolute state path.
 *
 * This is called **before** `resolveElementProps` so the component can
 * receive both the resolved value (in `props`) and the write-back path
 * (in `bindings`).
 *
 * @example
 * ```ts
 * const rawProps = { value: { $bindState: "/form/email" }, label: "Email" };
 * const bindings = resolveBindings(rawProps, ctx);
 * // bindings = { value: "/form/email" }
 * ```
 */
export function resolveBindings(
  props: Record<string, unknown>,
  ctx: PropResolutionContext,
): Record<string, string> | undefined {
  let bindings: Record<string, string> | undefined;
  for (const [key, value] of Object.entries(props)) {
    if (isBindStateExpression(value)) {
      if (!bindings) bindings = {};
      bindings[key] = value.$bindState;
    } else if (isBindItemExpression(value)) {
      const resolved = resolveBindItemPath(value.$bindItem, ctx);
      if (resolved !== undefined) {
        if (!bindings) bindings = {};
        bindings[key] = resolved;
      }
    }
  }
  return bindings;
}

/**
 * Resolve a single action parameter value.
 *
 * Like {@link resolvePropValue} but with special handling for path-valued
 * params: `{ $item: "field" }` resolves to an **absolute state path**
 * (e.g. `/todos/0/field`) instead of the field's value, so the path can
 * be passed to `setState` / `pushState` / `removeState`.
 *
 * - `{ $item: "field" }` → absolute state path via `repeatBasePath`
 * - `{ $index: true }` → current repeat index (number)
 * - Everything else delegates to `resolvePropValue` ($state, $cond, literals).
 */
export function resolveActionParam(
  value: unknown,
  ctx: PropResolutionContext,
): unknown {
  if (isItemExpression(value)) {
    return resolveBindItemPath(value.$item, ctx);
  }
  if (isIndexExpression(value)) {
    return ctx.repeatIndex;
  }
  return resolvePropValue(value, ctx);
}

import { z } from "zod";
import type {
  VisibilityCondition,
  StateCondition,
  ItemCondition,
  IndexCondition,
  SingleCondition,
  AndCondition,
  OrCondition,
  StateModel,
} from "./types";
import { getByPath } from "./types";

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for a single state condition.
 */
const numericOrStateRef = z.union([
  z.number(),
  z.object({ $state: z.string() }),
]);

const comparisonOps = {
  eq: z.unknown().optional(),
  neq: z.unknown().optional(),
  gt: numericOrStateRef.optional(),
  gte: numericOrStateRef.optional(),
  lt: numericOrStateRef.optional(),
  lte: numericOrStateRef.optional(),
  not: z.literal(true).optional(),
};

const StateConditionSchema = z.object({
  $state: z.string(),
  ...comparisonOps,
});

const ItemConditionSchema = z.object({
  $item: z.string(),
  ...comparisonOps,
});

const IndexConditionSchema = z.object({
  $index: z.literal(true),
  ...comparisonOps,
});

const SingleConditionSchema = z.union([
  StateConditionSchema,
  ItemConditionSchema,
  IndexConditionSchema,
]);

/**
 * Visibility condition schema.
 *
 * Lazy because `OrCondition` can recursively contain `VisibilityCondition`.
 */
export const VisibilityConditionSchema: z.ZodType<VisibilityCondition> = z.lazy(
  () =>
    z.union([
      z.boolean(),
      SingleConditionSchema,
      z.array(SingleConditionSchema),
      z.object({ $and: z.array(VisibilityConditionSchema) }),
      z.object({ $or: z.array(VisibilityConditionSchema) }),
    ]),
);

const StrictSingleConditionSchema = z.union([
  z.strictObject({ $state: z.string(), ...comparisonOps }),
  z.strictObject({ $item: z.string(), ...comparisonOps }),
  z.strictObject({ $index: z.literal(true), ...comparisonOps }),
]);

/**
 * Strict variant for spec validation: rejects unknown keys, so malformed
 * conditions (e.g. mixing $state and $item in one object) are caught at
 * validation time instead of silently evaluating to hidden at runtime.
 */
/**
 * True when a condition references the repeat-item scope ($item or $index)
 * anywhere in its tree. Renderers use this to apply a repeat container's own
 * visible condition as a per-item filter instead of evaluating it (and
 * failing) outside the repeat scope.
 */
export function conditionUsesItemScope(
  condition: VisibilityCondition | undefined,
): boolean {
  if (condition === undefined || typeof condition === "boolean") return false;
  if (Array.isArray(condition)) return condition.some(conditionUsesItemScope);
  if (typeof condition !== "object" || condition === null) return false;
  if ("$item" in condition || "$index" in condition) return true;
  if ("$and" in condition)
    return (condition as { $and: VisibilityCondition[] }).$and.some(
      conditionUsesItemScope,
    );
  if ("$or" in condition)
    return (condition as { $or: VisibilityCondition[] }).$or.some(
      conditionUsesItemScope,
    );
  return false;
}

/**
 * Splits a repeat container's visible condition into a container-level gate
 * and a per-item filter. Top-level AND structures (arrays, $and) partition
 * cleanly: conjuncts that reference $item/$index filter items, the rest gate
 * the container. An $or that mixes scopes cannot be partitioned soundly and
 * is applied entirely per item (state parts still evaluate correctly there;
 * the container shell just cannot be hidden by it).
 */
export function splitRepeatVisibility(
  condition: VisibilityCondition | undefined,
): {
  container: VisibilityCondition | undefined;
  itemFilter: VisibilityCondition | undefined;
} {
  if (condition === undefined || !conditionUsesItemScope(condition)) {
    return { container: condition, itemFilter: undefined };
  }
  const partition = (parts: VisibilityCondition[]) => {
    const container = parts.filter((part) => !conditionUsesItemScope(part));
    const item = parts.filter((part) => conditionUsesItemScope(part));
    return {
      container: container.length > 0 ? { $and: container } : undefined,
      itemFilter: item.length > 0 ? { $and: item } : undefined,
    };
  };
  if (Array.isArray(condition)) return partition(condition);
  if (
    typeof condition === "object" &&
    condition !== null &&
    "$and" in condition
  ) {
    return partition((condition as { $and: VisibilityCondition[] }).$and);
  }
  // Single item-scoped condition or an $or that mixes scopes.
  return { container: undefined, itemFilter: condition };
}

export const VisibilityConditionStrictSchema: z.ZodType<VisibilityCondition> =
  z.lazy(() =>
    z.union([
      z.boolean(),
      StrictSingleConditionSchema,
      z.array(StrictSingleConditionSchema),
      z.strictObject({ $and: z.array(VisibilityConditionStrictSchema) }),
      z.strictObject({ $or: z.array(VisibilityConditionStrictSchema) }),
    ]),
  );

// =============================================================================
// Context
// =============================================================================

/**
 * Context for evaluating visibility conditions.
 *
 * `repeatItem` and `repeatIndex` are only present inside a `repeat` scope
 * and enable `$item` / `$index` conditions.
 */
export interface VisibilityContext {
  stateModel: StateModel;
  /** The current repeat item (set inside a repeat scope). */
  repeatItem?: unknown;
  /** The current repeat array index (set inside a repeat scope). */
  repeatIndex?: number;
}

// =============================================================================
// Evaluation
// =============================================================================

/**
 * Resolve a comparison value. If it's a `{ $state }` reference, look it up;
 * otherwise return the literal.
 */
function resolveComparisonValue(
  value: unknown,
  ctx: VisibilityContext,
): unknown {
  if (typeof value === "object" && value !== null) {
    if (
      "$state" in value &&
      typeof (value as Record<string, unknown>).$state === "string"
    ) {
      return getByPath(ctx.stateModel, (value as { $state: string }).$state);
    }
  }
  return value;
}

/**
 * Type guards for condition sources.
 */
function isItemCondition(cond: SingleCondition): cond is ItemCondition {
  return "$item" in cond;
}

function isIndexCondition(cond: SingleCondition): cond is IndexCondition {
  return "$index" in cond;
}

/**
 * Resolve the left-hand-side value of a condition based on its source.
 */
function resolveConditionValue(
  cond: SingleCondition,
  ctx: VisibilityContext,
): unknown {
  if (isIndexCondition(cond)) {
    return ctx.repeatIndex;
  }
  if (isItemCondition(cond)) {
    if (ctx.repeatItem === undefined) return undefined;
    return cond.$item === ""
      ? ctx.repeatItem
      : getByPath(ctx.repeatItem, cond.$item);
  }
  // StateCondition
  return getByPath(ctx.stateModel, (cond as StateCondition).$state);
}

/**
 * Coerce a comparison operand to a finite number.
 * Accepts numbers and numeric strings (`"10"`) so LLM/YAML quoted counts
 * still work with gt/gte/lt/lte. Empty strings, booleans, and `"10px"`
 * are not numbers.
 */
function toComparableNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function compareNumbers(
  value: unknown,
  rhs: unknown,
  op: (a: number, b: number) => boolean,
): boolean {
  const left = toComparableNumber(value);
  const right = toComparableNumber(rhs);
  return left !== undefined && right !== undefined ? op(left, right) : false;
}

/**
 * Evaluate a single condition against the context.
 *
 * When `not` is `true`, the final result is inverted — this applies to
 * whichever operator is present (or to the truthiness check if no operator
 * is given).  For example:
 * - `{ $state: "/x", not: true }` → `!Boolean(value)`
 * - `{ $state: "/x", gt: 5, not: true }` → `!(value > 5)`
 */
function evaluateCondition(
  cond: SingleCondition,
  ctx: VisibilityContext,
): boolean {
  const value = resolveConditionValue(cond, ctx);
  let result: boolean;

  // Equality
  if (cond.eq !== undefined) {
    const rhs = resolveComparisonValue(cond.eq, ctx);
    result = value === rhs;
  }
  // Inequality
  else if (cond.neq !== undefined) {
    const rhs = resolveComparisonValue(cond.neq, ctx);
    result = value !== rhs;
  }
  // Greater than
  else if (cond.gt !== undefined) {
    const rhs = resolveComparisonValue(cond.gt, ctx);
    result = compareNumbers(value, rhs, (a, b) => a > b);
  }
  // Greater than or equal
  else if (cond.gte !== undefined) {
    const rhs = resolveComparisonValue(cond.gte, ctx);
    result = compareNumbers(value, rhs, (a, b) => a >= b);
  }
  // Less than
  else if (cond.lt !== undefined) {
    const rhs = resolveComparisonValue(cond.lt, ctx);
    result = compareNumbers(value, rhs, (a, b) => a < b);
  }
  // Less than or equal
  else if (cond.lte !== undefined) {
    const rhs = resolveComparisonValue(cond.lte, ctx);
    result = compareNumbers(value, rhs, (a, b) => a <= b);
  }
  // Truthiness (no operator)
  else {
    result = Boolean(value);
  }

  // `not` inverts the result of any condition
  return cond.not === true ? !result : result;
}

/**
 * Type guard for AndCondition
 */
function isAndCondition(
  condition: VisibilityCondition,
): condition is AndCondition {
  return (
    typeof condition === "object" &&
    condition !== null &&
    !Array.isArray(condition) &&
    "$and" in condition
  );
}

/**
 * Type guard for OrCondition
 */
function isOrCondition(
  condition: VisibilityCondition,
): condition is OrCondition {
  return (
    typeof condition === "object" &&
    condition !== null &&
    !Array.isArray(condition) &&
    "$or" in condition
  );
}

/**
 * Evaluate a visibility condition.
 *
 * - `undefined` → visible
 * - `boolean` → that value
 * - `SingleCondition` → evaluate single condition
 * - `SingleCondition[]` → implicit AND (all must be true)
 * - `AndCondition` → `{ $and: [...] }`, explicit AND
 * - `OrCondition` → `{ $or: [...] }`, at least one must be true
 */
export function evaluateVisibility(
  condition: VisibilityCondition | undefined,
  ctx: VisibilityContext,
): boolean {
  // No condition = visible
  if (condition === undefined) {
    return true;
  }

  // Boolean literal
  if (typeof condition === "boolean") {
    return condition;
  }

  // Array = implicit AND
  if (Array.isArray(condition)) {
    return condition.every((c) => evaluateCondition(c, ctx));
  }

  // Explicit AND condition
  if (isAndCondition(condition)) {
    return condition.$and.every((child) => evaluateVisibility(child, ctx));
  }

  // OR condition
  if (isOrCondition(condition)) {
    return condition.$or.some((child) => evaluateVisibility(child, ctx));
  }

  // Single condition
  return evaluateCondition(condition, ctx);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Helper to create visibility conditions.
 */
export const visibility = {
  /** Always visible */
  always: true as const,

  /** Never visible */
  never: false as const,

  /** Visible when state path is truthy */
  when: (path: string): StateCondition => ({ $state: path }),

  /** Visible when state path is falsy */
  unless: (path: string): StateCondition => ({ $state: path, not: true }),

  /** Equality check */
  eq: (path: string, value: unknown): StateCondition => ({
    $state: path,
    eq: value,
  }),

  /** Not equal check */
  neq: (path: string, value: unknown): StateCondition => ({
    $state: path,
    neq: value,
  }),

  /** Greater than */
  gt: (path: string, value: number | { $state: string }): StateCondition => ({
    $state: path,
    gt: value,
  }),

  /** Greater than or equal */
  gte: (path: string, value: number | { $state: string }): StateCondition => ({
    $state: path,
    gte: value,
  }),

  /** Less than */
  lt: (path: string, value: number | { $state: string }): StateCondition => ({
    $state: path,
    lt: value,
  }),

  /** Less than or equal */
  lte: (path: string, value: number | { $state: string }): StateCondition => ({
    $state: path,
    lte: value,
  }),

  /** AND multiple conditions */
  and: (...conditions: VisibilityCondition[]): AndCondition => ({
    $and: conditions,
  }),

  /** OR multiple conditions */
  or: (...conditions: VisibilityCondition[]): OrCondition => ({
    $or: conditions,
  }),
};

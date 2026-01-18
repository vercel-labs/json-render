import { z } from "zod";

/**
 * Dynamic value - can be a literal or a path reference to data model
 */
export type DynamicValue<T = unknown> = T | { path: string };

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
  z.object({ path: z.string() }),
]);

export const DynamicStringSchema = z.union([
  z.string(),
  z.object({ path: z.string() }),
]);

export const DynamicNumberSchema = z.union([
  z.number(),
  z.object({ path: z.string() }),
]);

export const DynamicBooleanSchema = z.union([
  z.boolean(),
  z.object({ path: z.string() }),
]);

/**
 * Base UI element structure for v2
 */
export interface UIElement<
  T extends string = string,
  P = Record<string, unknown>,
> {
  /** Unique key for reconciliation */
  key: string;
  /** Component type from the catalog */
  type: T;
  /** Component props */
  props: P;
  /** Child element keys (flat structure) */
  children?: string[];
  /** Parent element key (null for root) */
  parentKey?: string | null;
  /** Visibility condition */
  visible?: VisibilityCondition;
}

/**
 * Visibility condition types
 */
export type VisibilityCondition =
  | boolean
  | { path: string }
  | { auth: "signedIn" | "signedOut" }
  | LogicExpression;

/**
 * Logic expression for complex conditions
 */
export type LogicExpression =
  | { and: LogicExpression[] }
  | { or: LogicExpression[] }
  | { not: LogicExpression }
  | { path: string }
  | { eq: [DynamicValue, DynamicValue] }
  | { neq: [DynamicValue, DynamicValue] }
  | { gt: [DynamicValue<number>, DynamicValue<number>] }
  | { gte: [DynamicValue<number>, DynamicValue<number>] }
  | { lt: [DynamicValue<number>, DynamicValue<number>] }
  | { lte: [DynamicValue<number>, DynamicValue<number>] };

/**
 * Flat UI tree structure (optimized for LLM generation)
 */
export interface UITree {
  /** Root element key */
  root: string;
  /** Flat map of elements by key */
  elements: Record<string, UIElement>;
}

/**
 * Auth state for visibility evaluation
 */
export interface AuthState {
  isSignedIn: boolean;
  user?: Record<string, unknown>;
}

/**
 * Data model type
 */
export type DataModel = Record<string, unknown>;

/**
 * Component schema definition using Zod
 */
export type ComponentSchema = z.ZodType<Record<string, unknown>>;

/**
 * Validation mode for catalog validation
 */
export type ValidationMode = "strict" | "warn" | "ignore";

/**
 * JSON patch operation types
 */
export type PatchOp = "add" | "remove" | "replace" | "set";

/**
 * JSON patch operation
 */
export interface JsonPatch {
  op: PatchOp;
  path?: string;
  dataPath?: string;
  value?: unknown;
}

/**
 * Resolve a dynamic value against a data model
 */
export function resolveDynamicValue<T>(
  value: DynamicValue<T>,
  dataModel: DataModel,
): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "object" && "path" in value) {
    return getByPath(dataModel, value.path) as T | undefined;
  }

  return value as T;
}

/**
 * Get a value from an object by JSON Pointer path
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === "/") {
    return obj;
  }

  const segments = path.startsWith("/")
    ? path.slice(1).split("/")
    : path.split("/");

  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a value in an object by JSON Pointer path
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = path.startsWith("/")
    ? path.slice(1).split("/")
    : path.split("/");

  if (segments.length === 0) return;

  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    if (!(segment in current) || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  const lastSegment = segments[segments.length - 1]!;
  current[lastSegment] = value;
}

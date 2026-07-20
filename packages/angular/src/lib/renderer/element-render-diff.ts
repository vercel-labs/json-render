import type { Type } from "@angular/core";
import type { Spec } from "@json-render/core";

/** Snapshot of what was last applied to a reused single-component slot. */
export interface AppliedSingle {
  componentClass: Type<unknown>;
  resolvedProps: Record<string, unknown>;
  bindings: Record<string, string> | undefined;
  loading: boolean;
  childrenKey: string;
  spec: Spec;
}

const CHILDREN_KEY_DELIMITER = "\u0001";

export function childrenKey(children: readonly string[] | undefined): string {
  return (children ?? []).join(CHILDREN_KEY_DELIMITER);
}

export function shallowEqualProps(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

export function bindingsEqual(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return shallowEqualProps(a, b);
}

/** Stable key for a repeat item: keyed by field when available, else index. */
export function stableItemKey(
  item: unknown,
  index: number,
  keyField?: string,
): string {
  if (keyField && item !== null && typeof item === "object") {
    return `k:${String((item as Record<string, unknown>)[keyField])}`;
  }
  return `i:${index}`;
}

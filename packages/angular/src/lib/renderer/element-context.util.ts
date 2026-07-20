import { getByPath } from "@json-render/core";
import type { PropResolutionContext } from "@json-render/core";

import { ChildrenOutletDirective } from "./children-outlet.directive";

export interface RepeatScopeLike {
  item: unknown;
  index: number;
  basePath: string;
}

/**
 * Extend a base prop-resolution context with the current repeat scope so
 * `$item` / `$index` / `$bindItem` resolve. Reads the live item from state (by
 * `basePath`) so item mutations are reflected without re-seeding the scope.
 */
export function buildRepeatContext(
  baseCtx: PropResolutionContext,
  scope: RepeatScopeLike,
): PropResolutionContext {
  const liveItem = getByPath(baseCtx.stateModel, scope.basePath);
  return {
    ...baseCtx,
    repeatItem: liveItem ?? scope.item,
    repeatIndex: scope.index,
    repeatBasePath: scope.basePath,
  };
}

/**
 * Resolve a registered component instance's optional children outlet. Supports
 * both a direct directive reference and a `ViewChild` getter function.
 */
export function resolveChildrenOutlet(
  instance: unknown,
): ChildrenOutletDirective | undefined {
  const holder = instance as { childrenOutlet?: unknown } | null | undefined;
  const raw = holder?.childrenOutlet;
  if (raw instanceof ChildrenOutletDirective) {
    return raw;
  }
  if (typeof raw === "function") {
    const resolved = (raw as () => unknown)();
    return resolved instanceof ChildrenOutletDirective ? resolved : undefined;
  }
  return undefined;
}

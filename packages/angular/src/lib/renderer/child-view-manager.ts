import { createEnvironmentInjector } from "@angular/core";
import type {
  ComponentRef,
  EnvironmentInjector,
  Type,
  ViewContainerRef,
} from "@angular/core";
import { evaluateVisibility } from "@json-render/core";
import type { Spec, UIElement, VisibilityCondition } from "@json-render/core";

import { stableItemKey } from "./element-render-diff";
import { RepeatScopeService } from "../services/repeat-scope.service";

export type RendererClass = Type<{
  element: unknown;
  spec: unknown;
  loading: unknown;
}>;

interface RepeatEntry {
  injector: EnvironmentInjector;
  scope: RepeatScopeService;
  componentRefs: ComponentRef<unknown>[];
  /** Child spec-element keys, index-aligned with `componentRefs`. */
  childKeys: string[];
}

interface IterationInput {
  element: UIElement;
  spec: Spec;
  loading: boolean;
  item: unknown;
  index: number;
  basePath: string;
}

/** Optional per-item filter for repeat rendering (B3: `$item` visibility). */
export interface RepeatFilter {
  itemFilter: VisibilityCondition | undefined;
  stateModel: Record<string, unknown>;
}

/**
 * Manages a single element's children and `repeat` output. Repeats use keyed
 * reconciliation: stable keys, per-item `EnvironmentInjector` carrying a
 * `RepeatScopeService`, and move-based reordering to match the target order.
 */
export class ChildViewManager {
  private childRenderers: ComponentRef<unknown>[] = [];
  private repeatEntries = new Map<string, RepeatEntry>();

  constructor(
    private readonly rendererClass: RendererClass,
    private readonly envInjector: EnvironmentInjector,
  ) {}

  renderChildren(
    childKeys: string[],
    spec: Spec,
    loading: boolean,
    vcr: ViewContainerRef,
  ): void {
    for (const childKey of childKeys) {
      const childElement = spec.elements[childKey];
      if (!childElement) {
        if (!loading) {
          console.warn(
            `[json-render] Missing element "${childKey}". This element will not render.`,
          );
        }
        continue;
      }
      this.childRenderers.push(
        this.createChild(childElement, spec, loading, vcr, this.envInjector),
      );
    }
  }

  renderRepeat(
    element: UIElement,
    spec: Spec,
    loading: boolean,
    items: readonly unknown[],
    vcr: ViewContainerRef,
    filter?: RepeatFilter,
  ): void {
    const statePath = element.repeat!.statePath;
    const keyField = element.repeat!.key;
    const orderedKeys: string[] = [];
    const nextEntries = new Map<string, RepeatEntry>();

    // Preserve original indices so `$item`/`basePath` resolve correctly even
    // when a per-item filter skips entries.
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (filter && !passesItemFilter(item, index, filter)) {
        continue;
      }
      const key = this.uniqueKey(
        stableItemKey(item, index, keyField),
        nextEntries,
      );
      orderedKeys.push(key);
      const input: IterationInput = {
        element,
        spec,
        loading,
        item,
        index,
        basePath: `${statePath}/${index}`,
      };
      const existing = this.repeatEntries.get(key);
      const entry = existing
        ? this.updateEntry(existing, input)
        : this.createEntry(input, vcr);
      nextEntries.set(key, entry);
    }

    this.removeStaleEntries(nextEntries);
    this.reorderEntries(orderedKeys, nextEntries, vcr);
    this.repeatEntries = nextEntries;
  }

  destroy(): void {
    for (const ref of this.childRenderers) {
      ref.destroy();
    }
    this.childRenderers = [];
    for (const entry of this.repeatEntries.values()) {
      for (const ref of entry.componentRefs) {
        ref.destroy();
      }
      entry.injector.destroy();
    }
    this.repeatEntries.clear();
  }

  private uniqueKey(
    candidate: string,
    taken: Map<string, RepeatEntry>,
  ): string {
    if (!taken.has(candidate)) {
      return candidate;
    }
    let suffix = 1;
    while (taken.has(`${candidate}#${suffix}`)) {
      suffix++;
    }
    return `${candidate}#${suffix}`;
  }

  private createEntry(
    input: IterationInput,
    vcr: ViewContainerRef,
  ): RepeatEntry {
    const scope = new RepeatScopeService();
    scope.item = input.item;
    scope.index = input.index;
    scope.basePath = input.basePath;
    const injector = createEnvironmentInjector(
      [{ provide: RepeatScopeService, useValue: scope }],
      this.envInjector,
    );
    const childKeys: string[] = [];
    const componentRefs = this.renderIteration(input, injector, vcr, childKeys);
    return { injector, scope, componentRefs, childKeys };
  }

  private updateEntry(entry: RepeatEntry, input: IterationInput): RepeatEntry {
    const reindexed = entry.scope.basePath !== input.basePath;
    entry.scope.item = input.item;
    entry.scope.index = input.index;
    entry.scope.basePath = input.basePath;
    entry.componentRefs.forEach((ref, i) => {
      if (reindexed) {
        const childKey = entry.childKeys[i];
        const childElement = childKey
          ? input.spec.elements[childKey]
          : undefined;
        if (childElement) {
          ref.setInput("element", { ...childElement });
        }
      }
      ref.setInput("spec", input.spec);
      ref.setInput("loading", input.loading);
    });
    return entry;
  }

  private removeStaleEntries(nextEntries: Map<string, RepeatEntry>): void {
    for (const [key, entry] of this.repeatEntries) {
      if (nextEntries.has(key)) {
        continue;
      }
      for (const ref of entry.componentRefs) {
        ref.destroy();
      }
      entry.injector.destroy();
    }
  }

  // Walk the target order left-to-right, placing each entry's contiguous block
  // of child views at the running cursor. Moving a view to an index at/after the
  // already-fixed prefix keeps that prefix intact, so the final VCR order
  // matches `orderedKeys` exactly.
  private reorderEntries(
    orderedKeys: string[],
    entries: Map<string, RepeatEntry>,
    vcr: ViewContainerRef,
  ): void {
    let cursor = 0;
    for (const key of orderedKeys) {
      const entry = entries.get(key);
      if (!entry) {
        continue;
      }
      for (const ref of entry.componentRefs) {
        if (vcr.indexOf(ref.hostView) !== cursor) {
          vcr.move(ref.hostView, cursor);
        }
        cursor++;
      }
    }
  }

  private renderIteration(
    input: IterationInput,
    injector: EnvironmentInjector,
    vcr: ViewContainerRef,
    childKeys: string[],
  ): ComponentRef<unknown>[] {
    const { element, spec, loading } = input;
    const refs: ComponentRef<unknown>[] = [];
    if (!element.children) {
      return refs;
    }
    for (const childKey of element.children) {
      const childElement = spec.elements[childKey];
      if (!childElement) {
        if (!loading) {
          console.warn(
            `[json-render] Missing element "${childKey}" as child of "${element.type}" (repeat).`,
          );
        }
        continue;
      }
      refs.push(this.createChild(childElement, spec, loading, vcr, injector));
      childKeys.push(childKey);
    }
    return refs;
  }

  private createChild(
    element: UIElement,
    spec: Spec,
    loading: boolean,
    vcr: ViewContainerRef,
    environmentInjector: EnvironmentInjector,
  ): ComponentRef<unknown> {
    const childRef = vcr.createComponent(this.rendererClass, {
      environmentInjector,
    });
    childRef.setInput("element", element);
    childRef.setInput("spec", spec);
    childRef.setInput("loading", loading);
    return childRef;
  }
}

/** Evaluate a repeat item against the per-item visibility filter. */
function passesItemFilter(
  item: unknown,
  index: number,
  filter: RepeatFilter,
): boolean {
  if (filter.itemFilter === undefined) {
    return true;
  }
  return evaluateVisibility(filter.itemFilter, {
    stateModel: filter.stateModel,
    repeatItem: item,
    repeatIndex: index,
  });
}

import type { Snippet } from "svelte";
import type {
  Catalog,
  InferCatalogComponents,
  InferCatalogActions,
  InferComponentProps,
  InferActionParams,
  StateModel,
} from "@json-render/core";

export type { StateModel };

// =============================================================================
// State Types
// =============================================================================

/**
 * State setter function for updating application state
 */
export type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

// =============================================================================
// Component Types
// =============================================================================

/**
 * Handle returned by the `on()` function for a specific event.
 * Provides metadata about the event binding and a method to fire it.
 */
export interface EventHandle {
  /** Fire the event (resolve action bindings) */
  emit: () => void;
  /** Whether any binding requested preventDefault */
  shouldPreventDefault: boolean;
  /** Whether any handler is bound to this event */
  bound: boolean;
}

/**
 * Catalog-agnostic base type for component render function arguments.
 * Use this when building reusable component libraries.
 */
export interface BaseComponentProps<P = Record<string, unknown>> {
  props: P;
  children?: Snippet;
  /** Simple event emitter (shorthand). Fires the event and returns void. */
  emit: (event: string) => void;
  /** Get an event handle with metadata. Use when you need shouldPreventDefault or bound checks. */
  on: (event: string) => EventHandle;
  /**
   * Two-way binding paths resolved from `$bindState` / `$bindItem` expressions.
   * Maps prop name → absolute state path for write-back.
   */
  bindings?: Record<string, string>;
  loading?: boolean;
}

/**
 * Context passed to component render functions
 */
export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> extends BaseComponentProps<InferComponentProps<C, K>> {}

/**
 * Component render function type for Svelte
 */
export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = (ctx: ComponentContext<C, K>) => void;

/**
 * Registry of all component render functions for a catalog
 */
export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: ComponentFn<C, K>;
};

// =============================================================================
// Action Types
// =============================================================================

/**
 * Action handler function type
 */
export type ActionFn<
  C extends Catalog,
  K extends keyof InferCatalogActions<C>,
> = (
  params: InferActionParams<C, K> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

/**
 * Registry of all action handlers for a catalog
 */
export type Actions<C extends Catalog> = {
  [K in keyof InferCatalogActions<C>]: ActionFn<C, K>;
};

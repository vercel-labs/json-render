import type {
  Catalog,
  InferCatalogComponents,
  InferCatalogActions,
  InferComponentProps,
  InferActionParams,
  StateModel,
} from "@json-render/core";

export type { StateModel };

/**
 * Imperative state setter passed to action handlers. Mirrors the React
 * renderer's `SetState`: an updater that receives the previous state model and
 * returns the next one.
 */
export type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

/**
 * Handle returned by a component's `on(event)` accessor. Lets a component know
 * whether an event is wired to an action (`bound`), whether the action requested
 * `preventDefault`, and exposes `emit()` to fire it.
 */
export interface EventHandle {
  emit: () => void;
  shouldPreventDefault: boolean;
  bound: boolean;
}

/**
 * The render context an Angular component receives (via inputs) when the
 * renderer mounts it. Equivalent to the baseline renderers' `BaseComponentProps`.
 */
export interface BaseComponentProps<P = Record<string, unknown>> {
  props: P;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}

/**
 * Catalog-aware component context. Resolves the concrete prop type for a given
 * catalog component key. Equivalent to the baseline renderers' `ComponentContext`.
 */
export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> extends BaseComponentProps<InferComponentProps<C, K>> {}

/**
 * A registered action implementation. Receives resolved params, an imperative
 * `setState`, and a snapshot of the current state model.
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
 * Map of action name to its implementation, inferred from the catalog.
 */
export type Actions<C extends Catalog> = {
  [K in keyof InferCatalogActions<C>]: ActionFn<C, K>;
};

/**
 * Factory that binds registered action handlers to the live state store. Wired
 * by `provideJsonRender` and invoked by the action dispatcher so each handler
 * receives `(params, setState, state)`.
 */
export type ActionHandlersFactory = (
  getSetState: () => SetState | undefined,
  getState: () => StateModel,
) => Record<string, (params: Record<string, unknown>) => Promise<void>>;

/**
 * Type-level predicate: `true` when a catalog declares any actions. Used to make
 * the `actions` option of `defineRegistry` required only when needed.
 */
export type CatalogHasActions<C extends Catalog> = [
  InferCatalogActions<C>,
] extends [never]
  ? false
  : [keyof InferCatalogActions<C>] extends [never]
    ? false
    : true;

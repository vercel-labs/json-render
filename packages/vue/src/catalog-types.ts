import type { VNode } from "vue";
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
 *
 * @example
 * ```ts
 * const press = on("press");
 * if (press.shouldPreventDefault) e.preventDefault();
 * press.emit();
 * ```
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
 * Use this when building reusable component libraries that are not tied to a specific catalog.
 *
 * @example
 * ```ts
 * const Card = ({ props, children }: BaseComponentProps<{ title?: string }>) =>
 *   h('div', null, [props.title, children])
 * ```
 */
export interface BaseComponentProps<P = Record<string, unknown>> {
  props: P;
  /** Rendered children (from the default slot) */
  children?: VNode | VNode[];
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
 * @example
 * const Button: ComponentFn<typeof catalog, 'Button'> = (ctx) => {
 *   return h('button', { onClick: () => ctx.emit("press") }, ctx.props.label)
 * }
 */
export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> extends BaseComponentProps<InferComponentProps<C, K>> {}

/**
 * Component render function type for Vue
 * @example
 * const Button: ComponentFn<typeof catalog, 'Button'> = ({ props, emit }) =>
 *   h('button', { onClick: () => emit("press") }, props.label)
 */
export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = (ctx: ComponentContext<C, K>) => VNode | VNode[] | null | string;

/**
 * Registry of all component render functions for a catalog
 * @example
 * const components: Components<typeof myCatalog> = {
 *   Button: ({ props }) => h('button', null, props.label),
 *   Input: ({ props }) => h('input', { placeholder: props.placeholder }),
 * };
 */
export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: ComponentFn<C, K>;
};

// =============================================================================
// Action Types
// =============================================================================

/**
 * Action handler function type
 * @example
 * const viewCustomers: ActionFn<typeof catalog, 'viewCustomers'> = async (params, setState) => {
 *   const data = await fetch('/api/customers');
 *   setState(prev => ({ ...prev, customers: data }));
 * };
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
 * @example
 * const actions: Actions<typeof myCatalog> = {
 *   viewCustomers: async (params, setState) => { ... },
 *   createCustomer: async (params, setState) => { ... },
 * };
 */
export type Actions<C extends Catalog> = {
  [K in keyof InferCatalogActions<C>]: ActionFn<C, K>;
};

/**
 * True when the catalog declares at least one action, false otherwise.
 * Used by defineRegistry to conditionally require the `actions` field.
 */
export type CatalogHasActions<C extends Catalog> = [
  InferCatalogActions<C>,
] extends [never]
  ? false
  : [keyof InferCatalogActions<C>] extends [never]
    ? false
    : true;

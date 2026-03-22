import type { ReactNode } from "react";
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
export type SetState = (path: string, value: unknown) => void;

// =============================================================================
// Component Types
// =============================================================================

/**
 * Context passed to component render functions
 * @example
 * const StatusBadge: ComponentFn<typeof catalog, 'Badge'> = (ctx) => {
 *   return <Text color="green">{ctx.props.label}</Text>
 * }
 */
export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> {
  props: InferComponentProps<C, K>;
  children?: ReactNode;
  /** Emit a named event. The renderer resolves the event to an action binding from the element's `on` field. */
  emit: (event: string) => void;
  /**
   * Two-way binding paths resolved from `$bindState` / `$bindItem` expressions.
   * Maps prop name → absolute state path for write-back.
   */
  bindings?: Record<string, string>;
  loading?: boolean;
}

/**
 * Component render function type for Ink
 * @example
 * const Badge: ComponentFn<typeof catalog, 'Badge'> = ({ props }) => (
 *   <Text color="green">{props.label}</Text>
 * );
 */
export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = (ctx: ComponentContext<C, K>) => ReactNode;

/**
 * Registry of all component render functions for a catalog
 * @example
 * const components: Components<typeof myCatalog> = {
 *   Badge: ({ props }) => <Text color="green">{props.label}</Text>,
 *   Card: ({ props, children }) => <Box borderStyle="round">{children}</Box>,
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
 * const exit: ActionFn<typeof catalog, 'exit'> = async (params, setState) => {
 *   process.exit(0);
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
 *   exit: async (params, setState) => { process.exit(0); },
 * };
 */
export type Actions<C extends Catalog> = {
  [K in keyof InferCatalogActions<C>]: ActionFn<C, K>;
};

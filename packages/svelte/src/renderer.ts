import type {
  Catalog,
  ComputedFunction,
  SchemaDefinition,
  Spec,
  StateStore,
  UIElement,
} from "@json-render/core";
import type { Component, Snippet } from "svelte";
import type {
  BaseComponentProps,
  EventHandle,
  SetState,
  StateModel,
} from "./catalog-types.js";
import CatalogRenderer from "./CatalogRenderer.svelte";

/**
 * Props passed to component renderers
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** The element being rendered */
  element: UIElement<string, P>;
  /** Rendered children snippet */
  children?: Snippet;
  /** Emit a named event. The renderer resolves the event to action binding(s) from the element's `on` field. */
  emit: (event: string) => void;
  /** Get an event handle with metadata */
  on: (event: string) => EventHandle;
  /**
   * Two-way binding paths resolved from `$bindState` / `$bindItem` expressions.
   * Maps prop name → absolute state path for write-back.
   */
  bindings?: Record<string, string>;
  /** Whether the parent is loading */
  loading?: boolean;
}

/**
 * Component renderer type - a Svelte component that receives ComponentRenderProps
 */
export type ComponentRenderer<P = Record<string, unknown>> = Component<
  ComponentRenderProps<P>
>;

/**
 * Registry of component renderers.
 * Maps component type names to Svelte components.
 */
export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

/**
 * Action handler function for defineRegistry
 */
type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

/**
 * Result returned by defineRegistry
 */
export interface DefineRegistryResult {
  /** Component registry for Renderer */
  registry: ComponentRegistry;
  /**
   * Create ActionProvider-compatible handlers.
   */
  handlers: (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ) => Record<string, (params: Record<string, unknown>) => Promise<void>>;
  /**
   * Execute an action by name imperatively
   */
  executeAction: (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state?: StateModel,
  ) => Promise<void>;
}

/**
 * Create a registry from a catalog with Svelte components and/or actions.
 *
 * Components must accept `BaseComponentProps` as their props interface.
 *
 * @example
 * ```ts
 * import { defineRegistry } from "@json-render/svelte";
 * import Card from "./components/Card.svelte";
 * import Button from "./components/Button.svelte";
 * import { myCatalog } from "./catalog";
 *
 * const { registry, handlers } = defineRegistry(myCatalog, {
 *   components: {
 *     Card,
 *     Button,
 *   },
 *   actions: {
 *     submit: async (params, setState) => {
 *       // handle action
 *     },
 *   },
 * });
 * ```
 */
export function defineRegistry<
  C extends Catalog,
  TComponents extends Record<string, Component<BaseComponentProps<any>>>,
>(
  _catalog: C,
  options: {
    /** Svelte components that accept BaseComponentProps */
    components?: TComponents;
    /** Action handlers */
    actions?: Record<string, DefineRegistryActionFn>;
  },
): DefineRegistryResult {
  const registry: ComponentRegistry = {};

  if (options.components) {
    for (const [name, componentFn] of Object.entries(options.components)) {
      registry[name] = (_, props) =>
        (componentFn as Component<BaseComponentProps<any>>)(_, {
          get props() {
            return props.element.props;
          },
          get children() {
            return props.children;
          },
          get emit() {
            return props.emit;
          },
          get on() {
            return props.on;
          },
          get bindings() {
            return props.bindings;
          },
          get loading() {
            return props.loading;
          },
        });
    }
  }

  // Build action helpers
  const actionMap = options.actions
    ? (Object.entries(options.actions) as Array<
        [string, DefineRegistryActionFn]
      >)
    : [];

  const handlers = (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ): Record<string, (params: Record<string, unknown>) => Promise<void>> => {
    const result: Record<
      string,
      (params: Record<string, unknown>) => Promise<void>
    > = {};
    for (const [name, actionFn] of actionMap) {
      result[name] = async (params) => {
        const setState = getSetState();
        const state = getState();
        if (setState) {
          await actionFn(params, setState, state);
        }
      };
    }
    return result;
  };

  const executeAction = async (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state: StateModel = {},
  ): Promise<void> => {
    const entry = actionMap.find(([name]) => name === actionName);
    if (entry) {
      await entry[1](params, setState, state);
    } else {
      console.warn(`Unknown action: ${actionName}`);
    }
  };

  return { registry, handlers, executeAction };
}

// ============================================================================
// createRenderer
// ============================================================================

/**
 * Props for renderers created with createRenderer
 */
export interface CreateRendererProps {
  spec: Spec | null;
  store?: StateStore;
  state?: Record<string, unknown>;
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  /** Named functions for `$computed` expressions in props */
  functions?: Record<string, ComputedFunction>;
  loading?: boolean;
  fallback?: Component;
}

/**
 * Component map type — maps component names to Vue components
 */
export type ComponentMap<
  TComponents extends Record<string, { props: unknown }>,
> = {
  [K in keyof TComponents]: Component<any, any, string>;
};

/**
 * Create a renderer from a catalog
 *
 * @example
 * ```typescript
 * const DashboardRenderer = createRenderer(dashboardCatalog, {
 *   Card,
 *   Metric,
 * });
 *
 * // Usage in template
 * <DashboardRenderer spec={aiGeneratedSpec} {state} />
 * ```
 */
export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  _catalog: Catalog<TDef, TCatalog>,
  components: ComponentMap<TCatalog["components"]>,
): Component<CreateRendererProps> {
  const registry: ComponentRegistry =
    components as unknown as ComponentRegistry;

  return (_, props: CreateRendererProps) =>
    CatalogRenderer(_, {
      registry,
      get spec() {
        return props.spec;
      },
      get store() {
        return props.store;
      },
      get state() {
        return props.state;
      },
      get onAction() {
        return props.onAction;
      },
      get onStateChange() {
        return props.onStateChange;
      },
      get functions() {
        return props.functions;
      },
      get loading() {
        return props.loading;
      },
      get fallback() {
        return props.fallback;
      },
    });
}

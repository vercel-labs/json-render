import {
  createContext,
  useContext,
  createMemo,
  createEffect,
  onCleanup,
  ErrorBoundary,
  Show,
  For,
  type JSX,
  type Component,
} from "solid-js";
import type {
  UIElement,
  Spec,
  ActionBinding,
  Catalog,
  SchemaDefinition,
  StateStore,
  ComputedFunction,
} from "@json-render/core";
import {
  resolveElementProps,
  resolveBindings,
  resolveActionParam,
  evaluateVisibility,
  getByPath,
  type PropResolutionContext,
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import type {
  Components,
  Actions,
  ActionFn,
  SetState,
  StateModel,
  CatalogHasActions,
  EventHandle,
} from "./catalog-types";
import { useIsVisible, useVisibility } from "./contexts/visibility";
import { useActions } from "./contexts/actions";
import { useStateStore } from "./contexts/state";
import { StateProvider } from "./contexts/state";
import { VisibilityProvider } from "./contexts/visibility";
import { ActionProvider } from "./contexts/actions";
import { ValidationProvider } from "./contexts/validation";
import { ConfirmDialog } from "./contexts/actions";
import { RepeatScopeProvider, useRepeatScope } from "./contexts/repeat-scope";

/**
 * Props passed to component renderers
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** The element being rendered */
  element: UIElement<string, P>;
  /** Rendered children */
  children?: JSX.Element;
  /** Emit a named event. The renderer resolves the event to action binding(s) from the element's `on` field. Always provided by the renderer. */
  emit: (event: string) => void;
  /** Get an event handle with metadata (shouldPreventDefault, bound). Use when you need to inspect event bindings. */
  on: (event: string) => EventHandle;
  /**
   * Two-way binding paths resolved from `$bindState` / `$bindItem` expressions.
   * Maps prop name → absolute state path for write-back.
   * Only present when at least one prop uses `{ $bindState: "..." }` or `{ $bindItem: "..." }`.
   */
  bindings?: Record<string, string>;
  /** Whether the parent is loading */
  loading?: boolean;
}

/**
 * Component renderer type
 */
export type ComponentRenderer<P = Record<string, unknown>> = Component<
  ComponentRenderProps<P>
>;

/**
 * Registry of component renderers
 */
export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

/**
 * Props for the Renderer component
 */
export interface RendererProps {
  /** The UI spec to render */
  spec: Spec | null;
  /** Component registry */
  registry: ComponentRegistry;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

// ---------------------------------------------------------------------------
// FunctionsContext – provides $computed functions to the element tree
// ---------------------------------------------------------------------------

const EMPTY_FUNCTIONS: Record<string, ComputedFunction> = {};

const FunctionsContext =
  createContext<Record<string, ComputedFunction>>(EMPTY_FUNCTIONS);

function useFunctions(): Record<string, ComputedFunction> {
  return useContext(FunctionsContext) ?? EMPTY_FUNCTIONS;
}

interface ElementRendererProps {
  element: UIElement;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

/**
 * Element renderer component.
 */
function ElementRenderer(props: ElementRendererProps) {
  const repeatScope = useRepeatScope();
  const { ctx } = useVisibility();
  const { execute } = useActions();
  const stateStore = useStateStore();
  const getSnapshot = () => stateStore.getSnapshot();
  const functions = useFunctions();

  // Build context with repeat scope and $computed functions
  const fullCtx = createMemo<PropResolutionContext>(() => {
    const repeatItem = repeatScope?.item;
    const repeatIndex = repeatScope?.index;
    const repeatBasePath = repeatScope?.basePath;

    return {
      get stateModel() {
        return ctx.stateModel;
      },
      ...(repeatItem !== undefined ? { repeatItem } : {}),
      ...(repeatIndex !== undefined ? { repeatIndex } : {}),
      ...(repeatBasePath !== undefined ? { repeatBasePath } : {}),
      functions,
    };
  });

  // Evaluate visibility (now supports $item/$index inside repeat scopes)
  const isVisible = createMemo(() =>
    props.element.visible === undefined
      ? true
      : evaluateVisibility(props.element.visible, fullCtx()),
  );

  // Create emit function that resolves events to action bindings.
  const emit = async (eventName: string) => {
    const onBindings = props.element.on;
    const binding = onBindings?.[eventName];
    if (!binding) return;
    const actionBindings = Array.isArray(binding) ? binding : [binding];
    for (const b of actionBindings) {
      if (!b.params) {
        await execute(b);
        continue;
      }
      // Build a fresh context with live store state so that $state
      // references in later actions see mutations from earlier ones.
      const liveCtx: PropResolutionContext = {
        ...fullCtx(),
        stateModel: getSnapshot(),
      };
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(b.params)) {
        resolved[key] = resolveActionParam(val, liveCtx);
      }
      await execute({ ...b, params: resolved });
    }
  };

  // Create on() function that returns an EventHandle with metadata for a specific event.
  const on = (eventName: string): EventHandle => {
    const onBindings = props.element.on;
    const binding = onBindings?.[eventName];
    if (!binding) {
      return { emit: () => {}, shouldPreventDefault: false, bound: false };
    }
    const actionBindings = Array.isArray(binding) ? binding : [binding];
    const shouldPreventDefault = actionBindings.some((b) => b.preventDefault);
    return {
      emit: () => emit(eventName),
      shouldPreventDefault,
      bound: true,
    };
  };

  // Watch effect: fire actions when watched state paths change.
  createEffect(() => {
    const watchConfig = props.element.watch;
    if (!watchConfig) return;
    const paths = Object.keys(watchConfig);
    if (paths.length === 0) return;

    const unsubscribe = stateStore.subscribeChanges((changes) => {
      const changedPaths = new Set(changes.map((change) => change.path));

      void (async () => {
        for (const path of paths) {
          if (!changedPaths.has(path)) continue;

          const binding = watchConfig[path];
          if (!binding) continue;
          const bindings = Array.isArray(binding) ? binding : [binding];

          for (const b of bindings) {
            if (!b.params) {
              await execute(b);
              continue;
            }
            const liveCtx: PropResolutionContext = {
              ...fullCtx(),
              stateModel: getSnapshot(),
            };
            const resolved: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(b.params)) {
              resolved[key] = resolveActionParam(val, liveCtx);
            }
            await execute({ ...b, params: resolved });
          }
        }
      })().catch(console.error);
    });

    onCleanup(() => {
      unsubscribe();
    });
  });

  // Resolve $bindState/$bindItem expressions → bindings map (prop name → state path)
  const elementBindings = createMemo(() => {
    const rawProps = props.element.props as Record<string, unknown>;
    return resolveBindings(rawProps, fullCtx());
  });

  // Resolve dynamic prop expressions ($state, $item, $index, $bindState, $bindItem, $cond/$then/$else)
  const resolvedElement = createMemo(() => {
    const rawProps = props.element.props as Record<string, unknown>;
    const resolvedProps = resolveElementProps(rawProps, fullCtx());
    return resolvedProps !== props.element.props
      ? { ...props.element, props: resolvedProps }
      : props.element;
  });

  return (
    <Show when={isVisible()}>
      <ErrorBoundary
        fallback={(err) => {
          console.error(
            `[json-render] Rendering error in <${props.element.type}>:`,
            err,
          );
          return null;
        }}
      >
        <ElementRendererContent
          resolvedElement={resolvedElement()}
          spec={props.spec}
          registry={props.registry}
          loading={props.loading}
          fallback={props.fallback}
          emit={emit}
          on={on}
          bindings={elementBindings()}
        />
      </ErrorBoundary>
    </Show>
  );
}

interface ElementRendererContentProps {
  resolvedElement: UIElement;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
}

/**
 * Inner content renderer, separated so it can be wrapped in Show + ErrorBoundary.
 */
function ElementRendererContent(props: ElementRendererContentProps) {
  // Get the component renderer
  const Comp = () =>
    props.registry[props.resolvedElement.type] ?? props.fallback;

  return (
    <Show
      when={Comp()}
      fallback={(() => {
        console.warn(
          `No renderer for component type: ${props.resolvedElement.type}`,
        );
        return null;
      })()}
    >
      {(ComponentFn) => {
        const Component = ComponentFn();
        // Render children (with repeat support)
        const children = () =>
          props.resolvedElement.repeat ? (
            <RepeatChildren
              element={props.resolvedElement}
              spec={props.spec}
              registry={props.registry}
              loading={props.loading}
              fallback={props.fallback}
            />
          ) : (
            <For each={props.resolvedElement.children ?? []}>
              {(childKey) => {
                const childElement = () => props.spec.elements[childKey];
                return (
                  <Show
                    when={childElement()}
                    fallback={(() => {
                      if (!props.loading) {
                        console.warn(
                          `[json-render] Missing element "${childKey}" referenced as child of "${props.resolvedElement.type}". This element will not render.`,
                        );
                      }
                      return null;
                    })()}
                  >
                    {(el) => (
                      <ElementRenderer
                        element={el()}
                        spec={props.spec}
                        registry={props.registry}
                        loading={props.loading}
                        fallback={props.fallback}
                      />
                    )}
                  </Show>
                );
              }}
            </For>
          );

        return (
          <Component
            element={props.resolvedElement}
            emit={props.emit}
            on={props.on}
            bindings={props.bindings}
            loading={props.loading}
          >
            {children()}
          </Component>
        );
      }}
    </Show>
  );
}

// ---------------------------------------------------------------------------
// RepeatChildren -- renders child elements once per item in a state array.
// Used when an element has a `repeat` field.
// ---------------------------------------------------------------------------

interface RepeatChildrenProps {
  element: UIElement;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

function RepeatChildren(props: RepeatChildrenProps) {
  const stateStore = useStateStore();
  const repeat = () => props.element.repeat!;
  const statePath = () => repeat().statePath;

  const items = () =>
    (getByPath(stateStore.state, statePath()) as unknown[] | undefined) ?? [];

  return (
    <For each={items()}>
      {(itemValue, index) => {
        const key = () => {
          const r = repeat();
          return r.key && typeof itemValue === "object" && itemValue !== null
            ? String((itemValue as Record<string, unknown>)[r.key] ?? index())
            : String(index());
        };

        return (
          <RepeatScopeProvider
            item={itemValue}
            index={index()}
            basePath={`${statePath()}/${index()}`}
          >
            <For each={props.element.children ?? []}>
              {(childKey) => {
                const childElement = () => props.spec.elements[childKey];
                return (
                  <Show
                    when={childElement()}
                    fallback={(() => {
                      if (!props.loading) {
                        console.warn(
                          `[json-render] Missing element "${childKey}" referenced as child of "${props.element.type}" (repeat). This element will not render.`,
                        );
                      }
                      return null;
                    })()}
                  >
                    {(el) => (
                      <ElementRenderer
                        element={el()}
                        spec={props.spec}
                        registry={props.registry}
                        loading={props.loading}
                        fallback={props.fallback}
                      />
                    )}
                  </Show>
                );
              }}
            </For>
          </RepeatScopeProvider>
        );
      }}
    </For>
  );
}

/**
 * Main renderer component
 */
export function Renderer(props: RendererProps) {
  const rootElement = createMemo(() => {
    const spec = props.spec;
    if (!spec || !spec.root) return undefined;
    return spec.elements[spec.root];
  });

  return (
    <Show when={rootElement()}>
      {(el) => (
        <ElementRenderer
          element={el()}
          spec={props.spec!}
          registry={props.registry}
          loading={props.loading}
          fallback={props.fallback}
        />
      )}
    </Show>
  );
}

/**
 * Props for JSONUIProvider
 */
export interface JSONUIProviderProps {
  /** Component registry */
  registry: ComponentRegistry;
  /**
   * External store (controlled mode). When provided, `initialState` and
   * `onStateChange` are ignored.
   */
  store?: StateStore;
  /** Initial state model (uncontrolled mode) */
  initialState?: Record<string, unknown>;
  /** Action handlers */
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  /** Navigation function */
  navigate?: (path: string) => void;
  /** Custom validation functions */
  validationFunctions?: Record<
    string,
    (value: unknown, args?: Record<string, unknown>) => boolean
  >;
  /** Named functions for `$computed` expressions in props */
  functions?: Record<string, ComputedFunction>;
  /** Callback when state changes (uncontrolled mode) */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  children: JSX.Element;
}

/**
 * Combined provider for all JSONUI contexts
 */
export function JSONUIProvider(props: JSONUIProviderProps) {
  return (
    <StateProvider
      store={props.store}
      initialState={props.initialState}
      onStateChange={props.onStateChange}
    >
      <VisibilityProvider>
        <ValidationProvider customFunctions={props.validationFunctions}>
          <ActionProvider handlers={props.handlers} navigate={props.navigate}>
            <FunctionsContext.Provider
              value={props.functions ?? EMPTY_FUNCTIONS}
            >
              {props.children}
              <ConfirmationDialogManager />
            </FunctionsContext.Provider>
          </ActionProvider>
        </ValidationProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

/**
 * Renders the confirmation dialog when needed
 */
function ConfirmationDialogManager() {
  const { pendingConfirmation, confirm, cancel } = useActions();

  return (
    <Show when={pendingConfirmation?.action.confirm}>
      {(confirmConfig) => (
        <ConfirmDialog
          confirm={confirmConfig()}
          onConfirm={confirm}
          onCancel={cancel}
        />
      )}
    </Show>
  );
}

// ============================================================================
// defineRegistry
// ============================================================================

/**
 * Result returned by defineRegistry
 */
export interface DefineRegistryResult {
  /** Component registry for `<Renderer registry={...} />` */
  registry: ComponentRegistry;
  /**
   * Create ActionProvider-compatible handlers.
   * Accepts getter functions so handlers always read the latest state/setState
   * (e.g. from refs or closures).
   */
  handlers: (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ) => Record<string, (params: Record<string, unknown>) => Promise<void>>;
  /**
   * Execute an action by name imperatively
   * (for use outside the Solid tree, e.g. initial state loading).
   */
  executeAction: (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state?: StateModel,
  ) => Promise<void>;
}

/**
 * Options for defineRegistry.
 *
 * When the catalog declares actions, the `actions` field is required.
 * When the catalog has no actions (or `actions: {}`), the field is optional.
 */
type DefineRegistryOptions<C extends Catalog> = {
  components?: Components<C>;
} & (CatalogHasActions<C> extends true
  ? { actions: Actions<C> }
  : { actions?: Actions<C> });

/**
 * Create a registry from a catalog with components and/or actions.
 *
 * When the catalog declares actions, the `actions` field is required.
 *
 * @example
 * ```tsx
 * // Components only (catalog has no actions)
 * const { registry } = defineRegistry(catalog, {
 *   components: {
 *     Card: (ctx) => (
 *       <div class="card">{ctx.props.title}{ctx.children}</div>
 *     ),
 *   },
 * });
 *
 * // Both (catalog declares actions)
 * const { registry, handlers, executeAction } = defineRegistry(catalog, {
 *   components: { ... },
 *   actions: { ... },
 * });
 * ```
 */
export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: DefineRegistryOptions<C>,
): DefineRegistryResult {
  // Build component registry
  const registry: ComponentRegistry = {};
  if (options.components) {
    for (const [name, componentFn] of Object.entries(options.components)) {
      registry[name] = (renderProps: ComponentRenderProps) => {
        return (componentFn as DefineRegistryComponentFn)({
          get props() {
            return renderProps.element.props;
          },
          get children() {
            return renderProps.children;
          },
          emit: renderProps.emit,
          on: renderProps.on,
          get bindings() {
            return renderProps.bindings;
          },
          get loading() {
            return renderProps.loading;
          },
        });
      };
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

/** @internal */
type DefineRegistryComponentFn = (ctx: {
  props: unknown;
  children?: JSX.Element;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}) => JSX.Element;

/** @internal */
type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

// ============================================================================
// NEW API
// ============================================================================

/**
 * Props for renderers created with createRenderer
 */
export interface CreateRendererProps {
  /** The spec to render (AI-generated JSON) */
  spec: Spec | null;
  /**
   * External store (controlled mode). When provided, `state` and
   * `onStateChange` are ignored.
   */
  store?: StateStore;
  /** State context for dynamic values (uncontrolled mode) */
  state?: Record<string, unknown>;
  /** Action handler */
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  /** Callback when state changes (uncontrolled mode) */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  /** Named functions for `$computed` expressions in props */
  functions?: Record<string, ComputedFunction>;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

/**
 * Component map type - maps component names to Solid components
 */
export type ComponentMap<
  TComponents extends Record<string, { props: unknown }>,
> = {
  [K in keyof TComponents]: Component<
    ComponentRenderProps<
      TComponents[K]["props"] extends { _output: infer O }
        ? O
        : Record<string, unknown>
    >
  >;
};

/**
 * Create a renderer from a catalog
 *
 * @example
 * ```typescript
 * const DashboardRenderer = createRenderer(dashboardCatalog, {
 *   Card: (renderProps) => <div class="card">{renderProps.children}</div>,
 *   Metric: (renderProps) => <span>{renderProps.element.props.value}</span>,
 * });
 *
 * // Usage
 * <DashboardRenderer spec={aiGeneratedSpec} state={state} />
 * ```
 */
export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  catalog: Catalog<TDef, TCatalog>,
  components: ComponentMap<TCatalog["components"]>,
): Component<CreateRendererProps> {
  // Convert component map to registry
  const registry: ComponentRegistry =
    components as unknown as ComponentRegistry;

  // Return the renderer component
  return function CatalogRenderer(props: CreateRendererProps) {
    // Wrap onAction with a Proxy so any action name routes to the callback
    const actionHandlers = () =>
      props.onAction
        ? new Proxy(
            {} as Record<
              string,
              (params: Record<string, unknown>) => void | Promise<void>
            >,
            {
              get: (_target, prop: string) => {
                return (params: Record<string, unknown>) =>
                  props.onAction!(prop, params);
              },
              has: () => true,
            },
          )
        : undefined;

    return (
      <StateProvider
        store={props.store}
        initialState={props.state}
        onStateChange={props.onStateChange}
      >
        <VisibilityProvider>
          <ValidationProvider>
            <ActionProvider handlers={actionHandlers()}>
              <FunctionsContext.Provider
                value={props.functions ?? EMPTY_FUNCTIONS}
              >
                <Renderer
                  spec={props.spec}
                  registry={registry}
                  loading={props.loading}
                  fallback={props.fallback}
                />
                <ConfirmationDialogManager />
              </FunctionsContext.Provider>
            </ActionProvider>
          </ValidationProvider>
        </VisibilityProvider>
      </StateProvider>
    );
  };
}

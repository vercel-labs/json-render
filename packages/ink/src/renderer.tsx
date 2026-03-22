import React, {
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import type {
  UIElement,
  Spec,
  Catalog,
  SchemaDefinition,
  StateStore,
} from "@json-render/core";
import {
  resolveElementProps,
  resolveBindings,
  resolveActionParam,
  evaluateVisibility,
  getByPath,
  type PropResolutionContext,
} from "@json-render/core";
import type {
  Components,
  Actions,
  SetState,
  StateModel,
} from "./catalog-types";
import { useVisibility, VisibilityProvider } from "./contexts/visibility";
import { useActions, ActionProvider, ConfirmDialog } from "./contexts/actions";
import { useStateStore, StateProvider } from "./contexts/state";
import { ValidationProvider } from "./contexts/validation";
import { standardComponents } from "./components/standard";
import { RepeatScopeProvider, useRepeatScope } from "./contexts/repeat-scope";
import { FocusProvider } from "./contexts/focus";

/**
 * Props passed to component renderers
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** The element being rendered */
  element: UIElement<string, P>;
  /** Rendered children */
  children?: ReactNode;
  /** Emit a named event. The renderer resolves the event to action binding(s) from the element's `on` field. */
  emit: (event: string) => void;
  /**
   * Two-way binding paths resolved from `$bindState` / `$bindItem` expressions.
   * Maps prop name → absolute state path for write-back.
   */
  bindings?: Record<string, string>;
  /** Whether the parent is loading */
  loading?: boolean;
}

/**
 * Component renderer type
 */
export type ComponentRenderer<P = Record<string, unknown>> = ComponentType<
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
  /**
   * Component registry. If omitted, only standard components are used.
   * When provided, custom components are merged with (and override) standard components.
   */
  registry?: ComponentRegistry;
  /** Whether to include standard components (default: true) */
  includeStandard?: boolean;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

// ---------------------------------------------------------------------------
// ElementErrorBoundary – catches rendering errors in individual elements
// ---------------------------------------------------------------------------

interface ElementErrorBoundaryProps {
  elementType: string;
  children: ReactNode;
}

interface ElementErrorBoundaryState {
  hasError: boolean;
  /** The elementType at the time of the error — used to reset when the type changes. */
  errorType: string | null;
}

class ElementErrorBoundary extends React.Component<
  ElementErrorBoundaryProps,
  ElementErrorBoundaryState
> {
  constructor(props: ElementErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorType: null };
  }

  static getDerivedStateFromError(): Partial<ElementErrorBoundaryState> {
    return { hasError: true, errorType: "__pending__" };
  }

  static getDerivedStateFromProps(
    props: ElementErrorBoundaryProps,
    state: ElementErrorBoundaryState,
  ): Partial<ElementErrorBoundaryState> | null {
    // Reset error state when the element type changes (e.g. spec update replaced
    // the erroring component). Same-key/same-type errors are still sticky to
    // prevent infinite error loops; callers can force a reset by changing the key.
    // "__pending__" means getDerivedStateFromError fired but componentDidCatch
    // hasn't set the real type yet — don't reset in that window.
    if (
      state.hasError &&
      state.errorType !== null &&
      state.errorType !== "__pending__" &&
      state.errorType !== props.elementType
    ) {
      return { hasError: false, errorType: null };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorType: this.props.elementType });
    console.error(
      `[json-render] Rendering error in <${this.props.elementType}>:`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
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
 * Memoized to prevent re-rendering all repeat children when state changes.
 */
const ElementRenderer = React.memo(function ElementRenderer({
  element,
  spec,
  registry,
  loading,
  fallback,
}: ElementRendererProps) {
  const repeatScope = useRepeatScope();
  const { ctx } = useVisibility();
  const { execute } = useActions();
  const { getSnapshot } = useStateStore();

  // Build context with repeat scope
  const fullCtx: PropResolutionContext = useMemo(
    () =>
      repeatScope
        ? {
            ...ctx,
            repeatItem: repeatScope.item,
            repeatIndex: repeatScope.index,
            repeatBasePath: repeatScope.basePath,
          }
        : ctx,
    [ctx, repeatScope],
  );

  // Evaluate visibility
  const isVisible =
    element.visible === undefined
      ? true
      : evaluateVisibility(element.visible, fullCtx);

  // Create emit function that resolves events to action bindings.
  // Errors are caught internally so callers (useInput callbacks) don't
  // produce unhandled promise rejections.
  const onBindings = element.on;
  const emit = useCallback(
    (eventName: string) => {
      const binding = onBindings?.[eventName];
      if (!binding) return;
      const actionBindings = Array.isArray(binding) ? binding : [binding];
      (async () => {
        for (const b of actionBindings) {
          if (!b.params) {
            await execute(b);
            continue;
          }
          const liveCtx: PropResolutionContext = {
            ...fullCtx,
            stateModel: getSnapshot(),
          };
          const resolved: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(b.params)) {
            resolved[key] = resolveActionParam(val, liveCtx);
          }
          await execute({ ...b, params: resolved });
        }
      })().catch((err) => {
        console.error(
          `[json-render] Error handling event "${eventName}":`,
          err,
        );
      });
    },
    [onBindings, execute, fullCtx, getSnapshot],
  );

  if (!isVisible) {
    return null;
  }

  // Resolve bindings and props
  const rawProps = element.props as Record<string, unknown>;
  const elementBindings = resolveBindings(rawProps, fullCtx);
  const resolvedProps = resolveElementProps(rawProps, fullCtx);

  const resolvedElement =
    resolvedProps !== element.props
      ? { ...element, props: resolvedProps }
      : element;

  const Component = registry[resolvedElement.type] ?? fallback;

  if (!Component) {
    console.warn(
      `[json-render] No renderer for component type: ${resolvedElement.type}`,
    );
    return null;
  }

  // Render children (with repeat support)
  const children = resolvedElement.repeat ? (
    <RepeatChildren
      element={resolvedElement}
      spec={spec}
      registry={registry}
      loading={loading}
      fallback={fallback}
    />
  ) : (
    resolvedElement.children?.map((childKey) => {
      const childElement = spec.elements[childKey];
      if (!childElement) {
        if (!loading) {
          console.warn(
            `[json-render] Missing element "${childKey}" referenced as child of "${resolvedElement.type}". This element will not render.`,
          );
        }
        return null;
      }
      return (
        <ElementRenderer
          key={childKey}
          element={childElement}
          spec={spec}
          registry={registry}
          loading={loading}
          fallback={fallback}
        />
      );
    })
  );

  return (
    <ElementErrorBoundary elementType={resolvedElement.type}>
      <Component
        element={resolvedElement}
        emit={emit}
        bindings={elementBindings}
        loading={loading}
      >
        {children}
      </Component>
    </ElementErrorBoundary>
  );
});

// ---------------------------------------------------------------------------
// RepeatChildren
// ---------------------------------------------------------------------------

function RepeatChildren({
  element,
  spec,
  registry,
  loading,
  fallback,
}: {
  element: UIElement;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}) {
  const { state } = useStateStore();
  const repeat = element.repeat!;
  const statePath = repeat.statePath;

  const raw = getByPath(state, statePath);
  const items = Array.isArray(raw) ? raw : [];

  return (
    <>
      {items.map((itemValue, index) => {
        const key =
          repeat.key && typeof itemValue === "object" && itemValue !== null
            ? String(
                (itemValue as Record<string, unknown>)[repeat.key] ?? index,
              )
            : String(index);

        return (
          <RepeatScopeProvider
            key={key}
            item={itemValue}
            index={index}
            basePath={`${statePath}/${index}`}
          >
            {element.children?.map((childKey) => {
              const childElement = spec.elements[childKey];
              if (!childElement) {
                if (!loading) {
                  console.warn(
                    `[json-render] Missing element "${childKey}" referenced as child of "${element.type}" (repeat). This element will not render.`,
                  );
                }
                return null;
              }
              return (
                <ElementRenderer
                  key={`${key}:${childKey}`}
                  element={childElement}
                  spec={spec}
                  registry={registry}
                  loading={loading}
                  fallback={fallback}
                />
              );
            })}
          </RepeatScopeProvider>
        );
      })}
    </>
  );
}

/**
 * Main renderer component.
 *
 * By default, standard Ink components are included.
 * Custom components in `registry` override standard ones with the same name.
 */
export function Renderer({
  spec,
  registry: customRegistry,
  includeStandard = true,
  loading,
  fallback,
}: RendererProps) {
  const registry: ComponentRegistry = useMemo(
    () => ({
      ...(includeStandard ? standardComponents : {}),
      ...customRegistry,
    }),
    [customRegistry, includeStandard],
  );

  if (!spec || !spec.root) {
    return null;
  }

  const rootElement = spec.elements[spec.root];
  if (!rootElement) {
    return null;
  }

  return (
    <ElementRenderer
      element={rootElement}
      spec={spec}
      registry={registry}
      loading={loading}
      fallback={fallback}
    />
  );
}

/**
 * Props for JSONUIProvider
 */
export interface JSONUIProviderProps {
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
  /** Callback when state changes (uncontrolled mode) */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  children: ReactNode;
}

/**
 * Combined provider for all JSONUI contexts
 */
export function JSONUIProvider({
  store,
  initialState,
  handlers,
  navigate,
  validationFunctions,
  onStateChange,
  children,
}: JSONUIProviderProps) {
  return (
    <StateProvider
      store={store}
      initialState={initialState}
      onStateChange={onStateChange}
    >
      <VisibilityProvider>
        <ValidationProvider customFunctions={validationFunctions}>
          <ActionProvider handlers={handlers} navigate={navigate}>
            <FocusProvider>
              {children}
              <ConfirmationDialogManager />
            </FocusProvider>
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

  if (!pendingConfirmation?.action.confirm) {
    return null;
  }

  return (
    <ConfirmDialog
      confirm={pendingConfirmation.action.confirm}
      onConfirm={confirm}
      onCancel={cancel}
    />
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
 * Create a registry from a catalog with components and/or actions.
 */
export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: {
    components?: Components<C>;
    actions?: Actions<C>;
  },
): DefineRegistryResult {
  const registry: ComponentRegistry = {};
  if (options.components) {
    for (const [name, componentFn] of Object.entries(options.components)) {
      registry[name] = ({
        element,
        children,
        emit,
        bindings,
        loading,
      }: ComponentRenderProps) => {
        return (componentFn as DefineRegistryComponentFn)({
          props: element.props,
          children,
          emit,
          bindings,
          loading,
        });
      };
    }
  }

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
        } else {
          console.warn(
            `[json-render] Action "${name}" skipped: setState not available. ` +
              `Ensure the action handler is used within a mounted StateProvider.`,
          );
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
      console.warn(`[json-render] Unknown action: ${actionName}`);
    }
  };

  return { registry, handlers, executeAction };
}

/** @internal */
type DefineRegistryComponentFn = (ctx: {
  props: unknown;
  children?: React.ReactNode;
  emit: (event: string) => void;
  bindings?: Record<string, string>;
  loading?: boolean;
}) => React.ReactNode;

/** @internal */
type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

// ============================================================================
// createRenderer
// ============================================================================

/**
 * Props for renderers created with createRenderer
 */
export interface CreateRendererProps {
  /** The spec to render (AI-generated JSON) */
  spec: Spec | null;
  /**
   * External store (controlled mode).
   */
  store?: StateStore;
  /** State context for dynamic values (uncontrolled mode) */
  state?: Record<string, unknown>;
  /** Action handler */
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  /** Callback when state changes (uncontrolled mode) */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

/**
 * Component map type
 */
export type ComponentMap<
  TComponents extends Record<string, { props: unknown }>,
> = {
  [K in keyof TComponents]: ComponentType<
    ComponentRenderProps<
      TComponents[K]["props"] extends { _output: infer O }
        ? O
        : Record<string, unknown>
    >
  >;
};

/**
 * Create a renderer from a catalog
 */
export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  _catalog: Catalog<TDef, TCatalog>,
  components: ComponentMap<TCatalog["components"]>,
): ComponentType<CreateRendererProps> {
  const registry: ComponentRegistry =
    components as unknown as ComponentRegistry;

  return function CatalogRenderer({
    spec,
    store,
    state,
    onAction,
    onStateChange,
    loading,
    fallback,
  }: CreateRendererProps) {
    const actionHandlers = useMemo(
      () =>
        onAction
          ? new Proxy(
              {} as Record<
                string,
                (params: Record<string, unknown>) => void | Promise<void>
              >,
              {
                get: (_target, prop: string) => {
                  return (params: Record<string, unknown>) =>
                    onAction(prop, params);
                },
                has: () => true,
              },
            )
          : undefined,
      [onAction],
    );

    return (
      <JSONUIProvider
        store={store}
        initialState={state}
        handlers={actionHandlers}
        onStateChange={onStateChange}
      >
        <Renderer
          spec={spec}
          registry={registry}
          loading={loading}
          fallback={fallback}
        />
      </JSONUIProvider>
    );
  };
}

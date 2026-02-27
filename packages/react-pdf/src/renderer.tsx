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
  ActionBinding,
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
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import type { Components, SetState, StateModel } from "./catalog-types";
import { useIsVisible, useVisibility } from "./contexts/visibility";
import { useActions } from "./contexts/actions";
import { useStateStore } from "./contexts/state";
import { StateProvider } from "./contexts/state";
import { VisibilityProvider } from "./contexts/visibility";
import { ActionProvider } from "./contexts/actions";
import { ValidationProvider } from "./contexts/validation";
import { standardComponents } from "./components/standard";
import { RepeatScopeProvider, useRepeatScope } from "./contexts/repeat-scope";

// =============================================================================
// Types
// =============================================================================

export interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  children?: ReactNode;
  emit: (event: string) => void;
  bindings?: Record<string, string>;
  loading?: boolean;
}

export type ComponentRenderer<P = Record<string, unknown>> = ComponentType<
  ComponentRenderProps<P>
>;

export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

export interface RendererProps {
  spec: Spec | null;
  registry?: ComponentRegistry;
  includeStandard?: boolean;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

// =============================================================================
// ElementErrorBoundary
// =============================================================================

interface ElementErrorBoundaryProps {
  elementType: string;
  children: ReactNode;
}

interface ElementErrorBoundaryState {
  hasError: boolean;
}

class ElementErrorBoundary extends React.Component<
  ElementErrorBoundaryProps,
  ElementErrorBoundaryState
> {
  constructor(props: ElementErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ElementErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[json-render/react-pdf] Rendering error in <${this.props.elementType}>:`,
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

// =============================================================================
// ElementRenderer
// =============================================================================

interface ElementRendererProps {
  element: UIElement;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

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

  const isVisible =
    element.visible === undefined
      ? true
      : evaluateVisibility(element.visible, fullCtx);

  const onBindings = element.on;
  const emit = useCallback(
    async (eventName: string) => {
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
          ...fullCtx,
          stateModel: getSnapshot(),
        };
        const resolved: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(b.params)) {
          resolved[key] = resolveActionParam(val, liveCtx);
        }
        await execute({ ...b, params: resolved });
      }
    },
    [onBindings, execute, fullCtx, getSnapshot],
  );

  if (!isVisible) {
    return null;
  }

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
      `[json-render/react-pdf] No renderer for component type: ${resolvedElement.type}`,
    );
    return null;
  }

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
            `[json-render/react-pdf] Missing element "${childKey}" referenced as child of "${resolvedElement.type}".`,
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

// =============================================================================
// RepeatChildren
// =============================================================================

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

  const items = (getByPath(state, statePath) as unknown[] | undefined) ?? [];

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
                    `[json-render/react-pdf] Missing element "${childKey}" referenced as child of "${element.type}" (repeat).`,
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
            })}
          </RepeatScopeProvider>
        );
      })}
    </>
  );
}

// =============================================================================
// Renderer
// =============================================================================

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

// =============================================================================
// JSONUIProvider
// =============================================================================

export interface JSONUIProviderProps {
  registry?: ComponentRegistry;
  store?: StateStore;
  initialState?: Record<string, unknown>;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  navigate?: (path: string) => void;
  validationFunctions?: Record<
    string,
    (value: unknown, args?: Record<string, unknown>) => boolean
  >;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  children: ReactNode;
}

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
        <ActionProvider handlers={handlers} navigate={navigate}>
          <ValidationProvider customFunctions={validationFunctions}>
            {children}
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

// =============================================================================
// defineRegistry
// =============================================================================

export interface DefineRegistryResult {
  registry: ComponentRegistry;
}

type DefineRegistryComponentFn = (ctx: {
  props: unknown;
  children?: React.ReactNode;
  emit: (event: string) => void;
  bindings?: Record<string, string>;
  loading?: boolean;
}) => React.ReactNode;

export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: {
    components?: Components<C>;
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

  return { registry };
}

// =============================================================================
// createRenderer
// =============================================================================

export interface CreateRendererProps {
  spec: Spec | null;
  store?: StateStore;
  state?: Record<string, unknown>;
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

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

export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  catalog: Catalog<TDef, TCatalog>,
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
    const actionHandlers = onAction
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
      : undefined;

    return (
      <StateProvider
        store={store}
        initialState={state}
        onStateChange={onStateChange}
      >
        <VisibilityProvider>
          <ActionProvider handlers={actionHandlers}>
            <ValidationProvider>
              <Renderer
                spec={spec}
                registry={registry}
                loading={loading}
                fallback={fallback}
              />
            </ValidationProvider>
          </ActionProvider>
        </VisibilityProvider>
      </StateProvider>
    );
  };
}

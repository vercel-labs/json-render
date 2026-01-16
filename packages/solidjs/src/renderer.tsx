import { Show, For, type Component, type JSX } from "solid-js";
import type {
  UIElement,
  UITree,
  Action,
  Catalog,
  ComponentDefinition,
} from "@json-render/core";
import { useIsVisible } from "./contexts/visibility";
import { useActions } from "./contexts/actions";

// Import the providers
import { DataProvider } from "./contexts/data";
import { VisibilityProvider } from "./contexts/visibility";
import { ActionProvider } from "./contexts/actions";
import { ValidationProvider } from "./contexts/validation";
import { ConfirmDialog } from "./contexts/actions";

/**
 * Props passed to component renderers
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** The element being rendered */
  element: UIElement<string, P>;
  /** Rendered children */
  children?: JSX.Element;
  /** Execute an action */
  onAction?: (action: Action) => void;
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
  /** The UI tree to render */
  tree: UITree | null;
  /** Component registry */
  registry: ComponentRegistry;
  /** Whether the tree is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

/**
 * Element renderer component
 */
function ElementRenderer(props: {
  element: UIElement;
  tree: UITree;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}): JSX.Element {
  const isVisible = useIsVisible(props.element.visible);
  const { execute } = useActions();

  return (
    <Show when={isVisible}>
      {(() => {
        // Get the component renderer
        const Component = props.registry[props.element.type] ?? props.fallback;

        if (!Component) {
          console.warn(`No renderer for component type: ${props.element.type}`);
          return null;
        }

        // Render children
        const children = (
          <For each={props.element.children ?? []}>
            {(childKey) => {
              const childElement = props.tree.elements[childKey];
              return (
                <Show when={childElement}>
                  <ElementRenderer
                    element={childElement!}
                    tree={props.tree}
                    registry={props.registry}
                    loading={props.loading}
                    fallback={props.fallback}
                  />
                </Show>
              );
            }}
          </For>
        );

        return (
          <Component
            element={props.element}
            onAction={execute}
            loading={props.loading}
          >
            {children}
          </Component>
        );
      })()}
    </Show>
  );
}

/**
 * Main renderer component
 */
export function Renderer(props: RendererProps): JSX.Element {
  return (
    <Show
      when={
        props.tree && props.tree.root && props.tree.elements[props.tree.root]
      }
    >
      {(() => {
        const tree = props.tree!;
        const rootElement = tree.elements[tree.root]!;
        return (
          <ElementRenderer
            element={rootElement}
            tree={tree}
            registry={props.registry}
            loading={props.loading}
            fallback={props.fallback}
          />
        );
      })()}
    </Show>
  );
}

/**
 * Props for JSONUIProvider
 */
export interface JSONUIProviderProps {
  /** Component registry */
  registry: ComponentRegistry;
  /** Initial data model */
  initialData?: Record<string, unknown>;
  /** Auth state */
  authState?: { isSignedIn: boolean; user?: Record<string, unknown> };
  /** Action handlers */
  actionHandlers?: Record<
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
  /** Callback when data changes */
  onDataChange?: (path: string, value: unknown) => void;
  children: JSX.Element;
}

/**
 * Combined provider for all JSONUI contexts
 */
export function JSONUIProvider(props: JSONUIProviderProps): JSX.Element {
  return (
    <DataProvider
      initialData={props.initialData}
      authState={props.authState}
      onDataChange={props.onDataChange}
    >
      <VisibilityProvider>
        <ActionProvider
          handlers={props.actionHandlers}
          navigate={props.navigate}
        >
          <ValidationProvider customFunctions={props.validationFunctions}>
            {props.children}
            <ConfirmationDialogManager />
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}

/**
 * Renders the confirmation dialog when needed
 */
function ConfirmationDialogManager(): JSX.Element {
  const { pendingConfirmation, confirm, cancel } = useActions();

  return (
    <Show when={pendingConfirmation()?.action.confirm}>
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

/**
 * Helper to create a renderer component from a catalog
 */
export function createRendererFromCatalog<
  C extends Catalog<Record<string, ComponentDefinition>>,
>(
  _catalog: C,
  registry: ComponentRegistry,
): Component<Omit<RendererProps, "registry">> {
  return function CatalogRenderer(props: Omit<RendererProps, "registry">) {
    return <Renderer {...props} registry={registry} />;
  };
}

/**
 * @json-render/react - React compatibility stub
 *
 * NOTE: The primary json-render library has been migrated to SolidJS.
 * This package provides React-compatible stubs for existing React applications.
 * For new projects, use @json-render/solidjs with SolidJS.
 */

import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  UITree,
  UIElement,
  Action,
  AuthState,
  DataModel,
  VisibilityCondition,
} from "@json-render/core";

// Re-export core types
export type {
  UITree,
  UIElement,
  Action,
  AuthState,
  DataModel,
  VisibilityCondition,
};

// Define ComponentRegistry locally since it's not in core
export type ComponentRegistry<T> = Record<string, T>;

// Alias for backwards compatibility
export type ActionConfig = Action;

// ============================================================================
// Component Props Types
// ============================================================================

export interface BaseComponentProps {
  element: UIElement;
  children?: ReactNode;
  loading?: boolean;
  onAction?: (action: ActionConfig) => void;
}

// Alias for backwards compatibility
export type ComponentRenderProps = BaseComponentProps;

export type ComponentType = React.ComponentType<BaseComponentProps>;

// ============================================================================
// Data Context
// ============================================================================

interface DataContextValue {
  data: DataModel;
  setData: (path: string, value: unknown) => void;
  set: (path: string, value: unknown) => void;
  getData: (path: string) => unknown;
  get: (path: string) => unknown;
  authState?: AuthState;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    const noop = () => {};
    const noopGet = () => undefined;
    return {
      data: {},
      setData: noop,
      set: noop,
      getData: noopGet,
      get: noopGet,
      authState: undefined,
    };
  }
  return ctx;
}

export function useDataValue<T>(path: string): T | undefined {
  const { getData } = useData();
  return getData(path) as T | undefined;
}

export function useDataBinding<T>(
  path: string,
): [() => T | undefined, (value: T) => void] {
  const { getData, setData } = useData();
  return [
    () => getData(path) as T | undefined,
    (value: T) => setData(path, value),
  ];
}

// ============================================================================
// Action Context
// ============================================================================

interface ActionContextValue {
  execute: (action: ActionConfig) => void;
}

const ActionContext = createContext<ActionContextValue | null>(null);

export function useActions(): ActionContextValue {
  const ctx = useContext(ActionContext);
  return ctx ?? { execute: () => {} };
}

// ============================================================================
// Visibility Hook
// ============================================================================

export function useIsVisible(_condition?: VisibilityCondition): boolean {
  // Stub: always visible
  return true;
}

// ============================================================================
// Validation Hook
// ============================================================================

export interface ValidationConfig {
  checks?: Array<{ fn: string; message: string }>;
  validateOn?: "change" | "blur" | "submit";
}

export interface UseFieldValidationReturn {
  errors: string[];
  validate: () => void;
  touch: () => void;
  clear: () => void;
  isValid: boolean;
}

export function useFieldValidation(
  _path: string,
  _config?: ValidationConfig,
): UseFieldValidationReturn {
  // Stub implementation - validation always passes
  return {
    errors: [],
    validate: () => {},
    touch: () => {},
    clear: () => {},
    isValid: true,
  };
}

// ============================================================================
// Individual Providers
// ============================================================================

export interface DataProviderProps {
  children: ReactNode;
  initialData?: DataModel;
  authState?: AuthState;
  onDataChange?: (path: string, value: unknown) => void;
}

export function DataProvider({
  children,
  initialData = {},
  authState,
  onDataChange,
}: DataProviderProps): React.ReactElement {
  const [data, setDataState] = useState<DataModel>(initialData);

  const setData = useCallback(
    (path: string, value: unknown) => {
      setDataState((prev) => {
        const newData = { ...prev };
        const parts = path.replace(/^\//, "").split("/");
        let current: Record<string, unknown> = newData;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (part && !(part in current)) {
            current[part] = {};
          }
          if (part) {
            current = current[part] as Record<string, unknown>;
          }
        }
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          current[lastPart] = value;
        }
        return newData;
      });
      onDataChange?.(path, value);
    },
    [onDataChange],
  );

  const getData = useCallback(
    (path: string): unknown => {
      const parts = path.replace(/^\//, "").split("/");
      let current: unknown = data;
      for (const part of parts) {
        if (current == null || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[part];
      }
      return current;
    },
    [data],
  );

  return (
    <DataContext.Provider
      value={{ data, setData, set: setData, getData, get: getData, authState }}
    >
      {children}
    </DataContext.Provider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionHandler = (params?: any) => void;

export interface ActionProviderProps {
  children: ReactNode;
  onAction?: (action: ActionConfig) => void;
  handlers?: Record<string, ActionHandler>;
}

export function ActionProvider({
  children,
  onAction,
  handlers,
}: ActionProviderProps): React.ReactElement {
  const execute = useCallback(
    (action: ActionConfig) => {
      // First try handlers by name
      if (handlers && action.name in handlers) {
        handlers[action.name]?.(action.params as Record<string, unknown>);
      }
      // Then call onAction callback
      onAction?.(action);
    },
    [onAction, handlers],
  );

  return (
    <ActionContext.Provider value={{ execute }}>
      {children}
    </ActionContext.Provider>
  );
}

export interface VisibilityProviderProps {
  children: ReactNode;
}

export function VisibilityProvider({
  children,
}: VisibilityProviderProps): React.ReactElement {
  return <>{children}</>;
}

// ============================================================================
// JSON UI Provider (Combined)
// ============================================================================

export interface JSONUIProviderProps {
  children: ReactNode;
  initialData?: DataModel;
  authState?: AuthState;
  registry?: ComponentRegistry<ComponentType>;
  onAction?: (action: ActionConfig) => void;
  onDataChange?: (path: string, value: unknown) => void;
}

export function JSONUIProvider({
  children,
  initialData = {},
  authState,
  onAction,
  onDataChange,
}: JSONUIProviderProps): React.ReactElement {
  return (
    <DataProvider
      initialData={initialData}
      authState={authState}
      onDataChange={onDataChange}
    >
      <ActionProvider onAction={onAction}>{children}</ActionProvider>
    </DataProvider>
  );
}

// ============================================================================
// Renderer
// ============================================================================

export interface RendererProps {
  tree: UITree | null;
  registry: ComponentRegistry<ComponentType>;
  loading?: boolean;
  fallback?: ComponentType;
}

export function Renderer({
  tree,
  registry,
  loading = false,
  fallback: Fallback,
}: RendererProps): React.ReactElement | null {
  const { execute } = useActions();

  if (!tree || !tree.root) {
    return null;
  }

  const renderElement = (key: string): React.ReactNode => {
    const element = tree.elements[key];
    if (!element) return null;

    const Component = registry[element.type] ?? Fallback;
    if (!Component) return null;

    const children = element.children?.map(renderElement);

    return (
      <Component
        key={key}
        element={element}
        loading={loading}
        onAction={execute}
      >
        {children}
      </Component>
    );
  };

  return <>{renderElement(tree.root)}</>;
}

// ============================================================================
// useUIStream Hook
// ============================================================================

export interface UseUIStreamOptions {
  api: string;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export interface SendOptions {
  data?: DataModel;
}

export interface UseUIStreamReturn {
  tree: UITree | null;
  isStreaming: boolean;
  error: Error | null;
  send: (prompt: string, options?: SendOptions) => Promise<void>;
  clear: () => void;
}

export function useUIStream(options: UseUIStreamOptions): UseUIStreamReturn {
  const [tree, setTree] = useState<UITree | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (prompt: string, sendOptions?: SendOptions) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setError(null);

      try {
        const response = await fetch(options.api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, data: sendOptions?.data }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        setTree(data.tree ?? data);
        options.onComplete?.();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const error = err as Error;
          setError(error);
          options.onError?.(error);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [options],
  );

  const clear = useCallback(() => {
    abortControllerRef.current?.abort();
    setTree(null);
    setIsStreaming(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { tree, isStreaming, error, send, clear };
}

// ============================================================================
// createRendererFromCatalog
// ============================================================================

export interface CatalogConfig {
  components: ComponentRegistry<ComponentType>;
  actions?: Record<string, (config: ActionConfig) => void>;
}

export interface CreateRendererResult {
  Renderer: React.ComponentType<Omit<RendererProps, "registry">>;
  Provider: React.ComponentType<Omit<JSONUIProviderProps, "registry">>;
}

export function createRendererFromCatalog(
  catalog: CatalogConfig,
): CreateRendererResult {
  const WrappedRenderer: React.FC<Omit<RendererProps, "registry">> = (
    props,
  ) => <Renderer {...props} registry={catalog.components} />;

  const WrappedProvider: React.FC<Omit<JSONUIProviderProps, "registry">> = ({
    children,
    onAction,
    ...props
  }) => {
    const handleAction = useCallback(
      (action: ActionConfig) => {
        catalog.actions?.[action.name]?.(action);
        onAction?.(action);
      },
      [onAction],
    );

    return (
      <JSONUIProvider
        {...props}
        registry={catalog.components}
        onAction={handleAction}
      >
        {children}
      </JSONUIProvider>
    );
  };

  return {
    Renderer: WrappedRenderer,
    Provider: WrappedProvider,
  };
}

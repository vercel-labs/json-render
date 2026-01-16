import {
  createContext,
  useContext,
  createSignal,
  type JSX,
  type Accessor,
} from "solid-js";
import {
  getByPath,
  setByPath,
  type DataModel,
  type AuthState,
} from "@json-render/core";

/**
 * Data context value
 */
export interface DataContextValue {
  /** The current data model (accessor function) */
  data: Accessor<DataModel>;
  /** Auth state for visibility evaluation */
  authState: Accessor<AuthState | undefined>;
  /** Get a value by path */
  get: (path: string) => unknown;
  /** Set a value by path */
  set: (path: string, value: unknown) => void;
  /** Update multiple values at once */
  update: (updates: Record<string, unknown>) => void;
}

const DataContext = createContext<DataContextValue>();

/**
 * Props for DataProvider
 */
export interface DataProviderProps {
  /** Initial data model */
  initialData?: DataModel;
  /** Auth state */
  authState?: AuthState;
  /** Callback when data changes */
  onDataChange?: (path: string, value: unknown) => void;
  children: JSX.Element;
}

/**
 * Provider for data model context
 */
export function DataProvider(props: DataProviderProps) {
  const [data, setData] = createSignal<DataModel>(props.initialData ?? {});
  // Note: authState is intentionally not reactive - it's expected to be set once at mount
  // If dynamic auth state updates are needed, consider passing an accessor instead
  const authState = (): AuthState | undefined => props.authState;

  const get = (path: string): unknown => getByPath(data(), path);

  const set = (path: string, value: unknown): void => {
    setData((prev) => {
      const next = { ...prev };
      setByPath(next, path, value);
      return next;
    });
    props.onDataChange?.(path, value);
  };

  const update = (updates: Record<string, unknown>): void => {
    setData((prev) => {
      const next = { ...prev };
      for (const [path, value] of Object.entries(updates)) {
        setByPath(next, path, value);
        props.onDataChange?.(path, value);
      }
      return next;
    });
  };

  const value: DataContextValue = {
    data,
    authState,
    get,
    set,
    update,
  };

  return (
    <DataContext.Provider value={value}>{props.children}</DataContext.Provider>
  );
}

/**
 * Hook to access the data context
 */
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within a DataProvider");
  }
  return ctx;
}

/**
 * Hook to get a value from the data model
 */
export function useDataValue<T>(path: string): T | undefined {
  const { get } = useData();
  return get(path) as T | undefined;
}

/**
 * Hook to get and set a value from the data model (like createSignal)
 */
export function useDataBinding<T>(
  path: string,
): [() => T | undefined, (value: T) => void] {
  const { get, set } = useData();
  const getValue = (): T | undefined => get(path) as T | undefined;
  const setValue = (newValue: T): void => set(path, newValue);
  return [getValue, setValue];
}

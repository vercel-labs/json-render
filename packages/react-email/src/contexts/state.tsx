import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { getByPath, setByPath, type StateModel } from "@json-render/core";

export interface StateContextValue {
  state: StateModel;
  get: (path: string) => unknown;
  set: (path: string, value: unknown) => void;
  update: (updates: Record<string, unknown>) => void;
}

const StateContext = createContext<StateContextValue | null>(null);

export interface StateProviderProps {
  initialState?: StateModel;
  onStateChange?: (path: string, value: unknown) => void;
  children: ReactNode;
}

export function StateProvider({
  initialState = {},
  onStateChange,
  children,
}: StateProviderProps) {
  const [state, setStateInternal] = useState<StateModel>(initialState);

  const stateRef = useRef(state);
  stateRef.current = state;

  const initialStateJsonRef = useRef<string>(JSON.stringify(initialState));

  useEffect(() => {
    const newJson = JSON.stringify(initialState);
    if (newJson !== initialStateJsonRef.current) {
      initialStateJsonRef.current = newJson;
      if (initialState && Object.keys(initialState).length > 0) {
        setStateInternal((prev) => ({ ...prev, ...initialState }));
      }
    }
  }, [initialState]);

  const get = useCallback(
    (path: string) => getByPath(stateRef.current, path),
    [],
  );

  const set = useCallback(
    (path: string, value: unknown) => {
      setStateInternal((prev) => {
        const next = { ...prev };
        setByPath(next, path, value);
        return next;
      });
      onStateChange?.(path, value);
    },
    [onStateChange],
  );

  const update = useCallback(
    (updates: Record<string, unknown>) => {
      const entries = Object.entries(updates);
      setStateInternal((prev) => {
        const next = { ...prev };
        for (const [path, value] of entries) {
          setByPath(next, path, value);
        }
        return next;
      });
      for (const [path, value] of entries) {
        onStateChange?.(path, value);
      }
    },
    [onStateChange],
  );

  const value = useMemo<StateContextValue>(
    () => ({ state, get, set, update }),
    [state, get, set, update],
  );

  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}

export function useStateStore(): StateContextValue {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error("useStateStore must be used within a StateProvider");
  }
  return ctx;
}

export function useStateValue<T>(path: string): T | undefined {
  const { state } = useStateStore();
  return getByPath(state, path) as T | undefined;
}

export function useStateBinding<T>(
  path: string,
): [T | undefined, (value: T) => void] {
  const { state, set } = useStateStore();
  const value = getByPath(state, path) as T | undefined;
  const setValue = useCallback(
    (newValue: T) => set(path, newValue),
    [path, set],
  );
  return [value, setValue];
}

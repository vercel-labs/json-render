import {
  createContext,
  useContext,
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  type Accessor,
  type ParentProps,
} from "solid-js";
import {
  getByPath,
  createStateStore,
  type StateModel,
  type StateStore,
} from "@json-render/core";
import { flattenToPointers } from "@json-render/core/store-utils";

export interface StateContextValue {
  state: StateModel;
  get: (path: string) => unknown;
  set: (path: string, value: unknown) => void;
  update: (updates: Record<string, unknown>) => void;
  getSnapshot: () => StateModel;
  subscribeChanges: (
    listener: (changes: Array<{ path: string; value: unknown }>) => void,
  ) => () => void;
}

const StateContext = createContext<StateContextValue | null>(null);

export interface StateProviderProps {
  store?: StateStore;
  initialState?: StateModel;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
}

function computeInitialFlat(
  isControlled: boolean,
  initialState: StateModel,
): Record<string, unknown> | null {
  if (isControlled) return null;
  if (Object.keys(initialState).length === 0) return {};
  return flattenToPointers(initialState);
}

export function StateProvider(props: ParentProps<StateProviderProps>) {
  let internalStore: StateStore | undefined;
  if (!props.store) {
    internalStore = createStateStore(props.initialState ?? {});
  }

  const store = () => props.store ?? internalStore!;

  const initialMode = props.store ? "controlled" : "uncontrolled";
  let modeWarned = false;

  if (
    typeof globalThis !== "undefined" &&
    (globalThis as any).process?.env?.NODE_ENV !== "production"
  ) {
    createEffect(() => {
      const currentMode = props.store ? "controlled" : "uncontrolled";
      if (currentMode !== initialMode && !modeWarned) {
        modeWarned = true;
        console.warn(
          `StateProvider: switching from ${initialMode} to ${currentMode} mode is not supported.`,
        );
      }
    });
  }

  let prevInitialState = props.initialState;
  let prevFlat: Record<string, unknown> | null = computeInitialFlat(
    !!props.store,
    props.initialState ?? {},
  );

  createEffect(() => {
    if (props.store) return;
    const initialState = props.initialState ?? {};
    if (initialState === prevInitialState) return;
    prevInitialState = initialState;
    const nextFlat =
      initialState && Object.keys(initialState).length > 0
        ? flattenToPointers(initialState)
        : {};
    const prevFlatObj = prevFlat ?? {};
    const allKeys = new Set([
      ...Object.keys(prevFlatObj),
      ...Object.keys(nextFlat),
    ]);
    const updates: Record<string, unknown> = {};
    for (const key of allKeys) {
      if (prevFlatObj[key] !== nextFlat[key]) {
        updates[key] = key in nextFlat ? nextFlat[key] : undefined;
      }
    }
    prevFlat = nextFlat;
    if (Object.keys(updates).length > 0) {
      store().update(updates);
    }
  });

  const [state, setState] = createSignal<StateModel>(store().getSnapshot(), {
    equals: false,
  });
  const changeListeners = new Set<
    (changes: Array<{ path: string; value: unknown }>) => void
  >();

  const subscribeChanges = (
    listener: (changes: Array<{ path: string; value: unknown }>) => void,
  ) => {
    changeListeners.add(listener);
    return () => {
      changeListeners.delete(listener);
    };
  };

  const notifyChanges = (changes: Array<{ path: string; value: unknown }>) => {
    for (const listener of changeListeners) {
      listener(changes);
    }
  };

  createEffect(() => {
    const s = store();
    setState(s.getSnapshot());
    const unsubscribe = s.subscribe(() => {
      setState(s.getSnapshot());
    });
    onCleanup(unsubscribe);
  });

  const set = (path: string, value: unknown) => {
    const s = store();
    const prev = s.getSnapshot();
    const prevValue = getByPath(prev, path);
    s.set(path, value);
    if (prevValue !== value) {
      const changes = [{ path, value }];
      notifyChanges(changes);
      if (!props.store && s.getSnapshot() !== prev) {
        props.onStateChange?.(changes);
      }
    }
  };

  const update = (updates: Record<string, unknown>) => {
    const s = store();
    const prev = s.getSnapshot();
    s.update(updates);
    const changes: Array<{ path: string; value: unknown }> = [];
    for (const [path, value] of Object.entries(updates)) {
      if (getByPath(prev, path) !== value) {
        changes.push({ path, value });
      }
    }
    if (changes.length > 0) {
      notifyChanges(changes);
      if (!props.store && s.getSnapshot() !== prev) {
        props.onStateChange?.(changes);
      }
    }
  };

  const get = (path: string) => store().get(path);

  const getSnapshot = () => store().getSnapshot();

  const ctx: StateContextValue = {
    get state() {
      return state();
    },
    get,
    set,
    update,
    getSnapshot,
    subscribeChanges,
  };

  return (
    <StateContext.Provider value={ctx}>{props.children}</StateContext.Provider>
  );
}

export function useStateStore(): StateContextValue {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error("useStateStore must be used within a StateProvider");
  }
  return ctx;
}

export function useStateValue<T>(path: string): Accessor<T | undefined> {
  const store = useStateStore();
  return createMemo(() => getByPath(store.state, path) as T | undefined);
}

export function useStateBinding<T>(
  path: string,
): [Accessor<T | undefined>, (value: T) => void] {
  const store = useStateStore();
  const value = createMemo(() => getByPath(store.state, path) as T | undefined);
  const setValue = (newValue: T) => store.set(path, newValue);
  return [value, setValue];
}

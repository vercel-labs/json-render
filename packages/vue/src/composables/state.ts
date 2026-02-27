import {
  computed,
  defineComponent,
  inject,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type PropType,
  type ShallowRef,
} from "vue";
import {
  createStateStore,
  getByPath,
  type StateModel,
  type StateStore,
} from "@json-render/core";
import { flattenToPointers } from "@json-render/core/store-utils";

/**
 * State context value
 */
export interface StateContextValue {
  /** Reactive state snapshot — use state.value in reactive contexts */
  state: ShallowRef<StateModel>;
  /** Get a value by path */
  get: (path: string) => unknown;
  /** Set a value by path */
  set: (path: string, value: unknown) => void;
  /** Update multiple values at once */
  update: (updates: Record<string, unknown>) => void;
  /** Return the live state snapshot from the underlying store (not through Vue reactivity). */
  getSnapshot: () => StateModel;
}

const STATE_KEY = Symbol("json-render:state");

/**
 * Props for StateProvider
 */
export interface StateProviderProps {
  /**
   * External store that owns the state. When provided, the provider operates
   * in **controlled mode** — `initialState` and `onStateChange` are ignored
   * and the store is the single source of truth.
   */
  store?: StateStore;
  /** Initial state model (used only in uncontrolled mode) */
  initialState?: StateModel;
  /**
   * Callback when state changes (used only in uncontrolled mode).
   * Called once per `set` or `update` with all changed entries.
   */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
}

/**
 * Provider for state model context.
 *
 * Supports two modes:
 * - **Controlled**: pass a `store` prop (e.g. backed by Redux / Zustand).
 * - **Uncontrolled** (default): omit `store` and optionally pass
 *   `initialState` / `onStateChange`.
 */
export const StateProvider = defineComponent({
  name: "StateProvider",
  props: {
    store: {
      type: Object as PropType<StateStore>,
      default: undefined,
    },
    initialState: {
      type: Object as PropType<StateModel>,
      default: undefined,
    },
    onStateChange: {
      type: Function as PropType<
        (changes: Array<{ path: string; value: unknown }>) => void
      >,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const isControlled = !!props.store;

    // Use external store (controlled) or create internal store (uncontrolled)
    const internalStore = !isControlled
      ? createStateStore(props.initialState ?? {})
      : null;
    const store: StateStore = props.store ?? internalStore!;

    const state = shallowRef<StateModel>(store.getSnapshot());

    const unsubscribe = store.subscribe(() => {
      state.value = store.getSnapshot();
    });
    onUnmounted(unsubscribe);

    // Sync external initialState changes (uncontrolled mode only)
    if (!isControlled) {
      let prevFlat: Record<string, unknown> =
        props.initialState && Object.keys(props.initialState).length > 0
          ? flattenToPointers(props.initialState)
          : {};

      watch(
        () => props.initialState,
        (newInitialState) => {
          if (!newInitialState) return;
          const nextFlat =
            Object.keys(newInitialState).length > 0
              ? flattenToPointers(newInitialState)
              : {};
          const allKeys = new Set([
            ...Object.keys(prevFlat),
            ...Object.keys(nextFlat),
          ]);
          const updates: Record<string, unknown> = {};
          for (const key of allKeys) {
            if (prevFlat[key] !== nextFlat[key]) {
              updates[key] = key in nextFlat ? nextFlat[key] : undefined;
            }
          }
          prevFlat = nextFlat;
          if (Object.keys(updates).length > 0) {
            store.update(updates);
          }
        },
      );
    }

    // Keep onStateChange in a ref so it always reads the latest callback
    const onStateChangeRef = ref(props.onStateChange);
    watch(
      () => props.onStateChange,
      (fn) => {
        onStateChangeRef.value = fn;
      },
    );

    const get = (path: string) => store.get(path);
    const getSnapshot = () => store.getSnapshot();

    const set = (path: string, value: unknown) => {
      const prev = store.getSnapshot();
      store.set(path, value);
      if (!isControlled && store.getSnapshot() !== prev) {
        onStateChangeRef.value?.([{ path, value }]);
      }
    };

    const update = (updates: Record<string, unknown>) => {
      const prev = store.getSnapshot();
      store.update(updates);
      if (!isControlled && store.getSnapshot() !== prev) {
        const changes: Array<{ path: string; value: unknown }> = [];
        for (const [path, value] of Object.entries(updates)) {
          if (getByPath(prev, path) !== value) {
            changes.push({ path, value });
          }
        }
        if (changes.length > 0) {
          onStateChangeRef.value?.(changes);
        }
      }
    };

    provide<StateContextValue>(STATE_KEY, {
      state,
      get,
      set,
      update,
      getSnapshot,
    });

    return () => slots.default?.();
  },
});

/**
 * Composable to access the state context
 */
export function useStateStore(): StateContextValue {
  const ctx = inject<StateContextValue>(STATE_KEY);
  if (!ctx) {
    throw new Error("useStateStore must be used within a StateProvider");
  }
  return ctx;
}

/**
 * Composable to get a value from the state model (reactive)
 */
export function useStateValue<T>(path: string): ComputedRef<T | undefined> {
  const { state } = useStateStore();
  return computed(() => getByPath(state.value, path) as T | undefined);
}

/**
 * Composable to get and set a value from the state model by path.
 *
 * This is the path-based variant for use in arbitrary composables. For
 * registry components that receive `bindings` from the renderer, prefer
 * `useBoundProp` which reads the already-resolved prop value and writes back
 * to the bound path.
 */
export function useStateBinding<T>(
  path: string,
): [ComputedRef<T | undefined>, (value: T) => void] {
  const { state, set } = useStateStore();
  const value = computed(() => getByPath(state.value, path) as T | undefined);
  const setValue = (newValue: T) => set(path, newValue);
  return [value, setValue];
}

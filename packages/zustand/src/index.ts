import type { StateModel, StateStore } from "@json-render/core";
import { createStoreAdapter } from "@json-render/core/store-utils";
import type { StoreApi } from "zustand";

export type { StateStore } from "@json-render/core";

/**
 * Options for {@link zustandStateStore}.
 */
export interface ZustandStateStoreOptions<S extends StateModel = StateModel> {
  /** A Zustand vanilla store (created with `createStore` from `zustand/vanilla`). */
  store: StoreApi<S>;
  /**
   * Select the json-render state slice from the Zustand store state.
   * Defaults to `(state) => state` (the entire store is the state model).
   */
  selector?: (state: S) => StateModel;
  /**
   * Apply a state change back to the Zustand store.
   * Defaults to a shallow merge (`store.setState(next)`) so that keys
   * outside the json-render model are preserved. Override this if you use
   * a selector and only want to update a nested slice, or pass
   * `(next, s) => s.setState(next as S, true)` for full replacement.
   */
  updater?: (nextState: StateModel, store: StoreApi<S>) => void;
}

/**
 * Create a {@link StateStore} backed by a Zustand store.
 *
 * @example
 * ```ts
 * import { createStore } from "zustand/vanilla";
 * import { zustandStateStore } from "@json-render/zustand";
 *
 * const bearStore = createStore(() => ({ count: 0, name: "Bear" }));
 *
 * const store = zustandStateStore({ store: bearStore });
 *
 * <StateProvider store={store}>...</StateProvider>
 * ```
 *
 * @example Using a selector for a nested slice:
 * ```ts
 * const appStore = createStore(() => ({
 *   ui: { count: 0 },
 *   auth: { token: null },
 * }));
 *
 * const store = zustandStateStore({
 *   store: appStore,
 *   selector: (s) => s.ui,
 *   updater: (next, s) => s.setState({ ui: next }),
 * });
 * ```
 */
export function zustandStateStore<S extends StateModel = StateModel>(
  options: ZustandStateStoreOptions<S>,
): StateStore {
  const {
    store,
    selector = (s: S) => s as StateModel,
    updater = (next, s) => s.setState(next as Partial<S>),
  } = options;

  return createStoreAdapter({
    getSnapshot: () => selector(store.getState()),
    setSnapshot: (next) => updater(next, store),
    subscribe(listener) {
      let prev = selector(store.getState());
      return store.subscribe(() => {
        const current = selector(store.getState());
        if (current !== prev) {
          prev = current;
          listener();
          // Re-read after listener in case it triggered a synchronous dispatch;
          // absorb that change so it doesn't fire a duplicate notification.
          prev = selector(store.getState());
        }
      });
    },
  });
}

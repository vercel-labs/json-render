import type { StateModel, StateStore } from "@json-render/core";
import { createStoreAdapter } from "@json-render/core/store-utils";
import type { Store, Action, UnknownAction } from "redux";

export type { StateStore } from "@json-render/core";

/**
 * Options for {@link reduxStateStore}.
 */
export interface ReduxStateStoreOptions<
  S extends StateModel = StateModel,
  A extends Action = UnknownAction,
> {
  /** The Redux store instance. */
  store: Store<S, A>;
  /**
   * Select the json-render state slice from the Redux state tree.
   * Defaults to `(state) => state` (the entire store is the state model).
   */
  selector?: (state: S) => StateModel;
  /**
   * Dispatch a state change back to the Redux store.
   *
   * Called for every `set` / `update` with the full next state model.
   * You must dispatch an action that replaces the selected slice.
   *
   * @example
   * ```ts
   * dispatch: (nextState, reduxStore) =>
   *   reduxStore.dispatch(replaceState(nextState))
   * ```
   */
  dispatch: (nextState: StateModel, store: Store<S, A>) => void;
}

/**
 * Create a {@link StateStore} backed by a Redux store.
 *
 * @example
 * ```ts
 * import { configureStore, createSlice } from "@reduxjs/toolkit";
 * import { reduxStateStore } from "@json-render/redux";
 *
 * const uiSlice = createSlice({
 *   name: "ui",
 *   initialState: { count: 0 } as Record<string, unknown>,
 *   reducers: {
 *     replaceUiState: (_state, action) => action.payload,
 *   },
 * });
 *
 * const reduxStore = configureStore({
 *   reducer: { ui: uiSlice.reducer },
 * });
 *
 * const store = reduxStateStore({
 *   store: reduxStore,
 *   selector: (state) => state.ui,
 *   dispatch: (next, s) => s.dispatch(uiSlice.actions.replaceUiState(next)),
 * });
 *
 * <StateProvider store={store}>...</StateProvider>
 * ```
 */
export function reduxStateStore<
  S extends StateModel = StateModel,
  A extends Action = UnknownAction,
>(options: ReduxStateStoreOptions<S, A>): StateStore {
  const { store, selector = (s: S) => s as StateModel, dispatch } = options;

  return createStoreAdapter({
    getSnapshot: () => selector(store.getState()),
    setSnapshot: (next) => dispatch(next, store),
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

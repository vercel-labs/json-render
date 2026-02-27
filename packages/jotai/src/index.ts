import type { StateModel, StateStore } from "@json-render/core";
import { createStoreAdapter } from "@json-render/core/store-utils";
import type { WritableAtom } from "jotai";
import { createStore as createJotaiStore } from "jotai/vanilla";

export type { StateStore } from "@json-render/core";

type JotaiStore = ReturnType<typeof createJotaiStore>;

/**
 * Options for {@link jotaiStateStore}.
 */
export interface JotaiStateStoreOptions {
  /** A writable atom that holds the json-render state model. */
  atom: WritableAtom<StateModel, [StateModel], void>;
  /**
   * The Jotai store instance. Defaults to `createStore()` from `jotai/vanilla`.
   * Pass your own if you use a `<Provider store={...}>` in your React tree.
   */
  store?: JotaiStore;
}

/**
 * Create a {@link StateStore} backed by a Jotai atom.
 *
 * @example
 * ```ts
 * import { atom } from "jotai";
 * import { jotaiStateStore } from "@json-render/jotai";
 *
 * const uiAtom = atom<Record<string, unknown>>({ count: 0 });
 *
 * const store = jotaiStateStore({ atom: uiAtom });
 *
 * <StateProvider store={store}>...</StateProvider>
 * ```
 *
 * @example With a shared Jotai store:
 * ```ts
 * import { atom, createStore } from "jotai";
 *
 * const jStore = createStore();
 * const uiAtom = atom<Record<string, unknown>>({ count: 0 });
 *
 * const store = jotaiStateStore({ atom: uiAtom, store: jStore });
 *
 * // In React:
 * <JotaiProvider store={jStore}>
 *   <StateProvider store={store}>...</StateProvider>
 * </JotaiProvider>
 * ```
 */
export function jotaiStateStore(options: JotaiStateStoreOptions): StateStore {
  const stateAtom = options.atom;
  const jStore = options.store ?? createJotaiStore();

  return createStoreAdapter({
    getSnapshot: () => jStore.get(stateAtom),
    setSnapshot: (next) => jStore.set(stateAtom, next),
    subscribe: (listener) => jStore.sub(stateAtom, listener),
  });
}

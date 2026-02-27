import type { StateModel, StateStore } from "@json-render/core";
import { createStoreAdapter } from "@json-render/core/store-utils";
import type { Atom } from "@xstate/store";

export type { StateStore } from "@json-render/core";

/**
 * Options for {@link xstateStoreStateStore}.
 */
export interface XstateStoreStateStoreOptions {
  /** An `@xstate/store` atom (created with `createAtom`). */
  atom: Atom<StateModel>;
}

/**
 * Create a {@link StateStore} backed by an `@xstate/store` atom.
 *
 * @example
 * ```ts
 * import { createAtom } from "@xstate/store";
 * import { xstateStoreStateStore } from "@json-render/xstate";
 *
 * const uiAtom = createAtom<Record<string, unknown>>({ count: 0 });
 *
 * const store = xstateStoreStateStore({ atom: uiAtom });
 *
 * <StateProvider store={store}>...</StateProvider>
 * ```
 */
export function xstateStoreStateStore(
  options: XstateStoreStateStoreOptions,
): StateStore {
  const { atom } = options;

  return createStoreAdapter({
    getSnapshot: () => atom.get(),
    setSnapshot: (next) => atom.set(next),
    subscribe(listener) {
      const sub = atom.subscribe(() => {
        listener();
      });
      return () => sub.unsubscribe();
    },
  });
}

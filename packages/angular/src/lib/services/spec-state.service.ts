import {
  Injectable,
  computed,
  signal,
  type Signal,
  type WritableSignal,
} from "@angular/core";
import { getByPath, setByPath, type StateModel } from "@json-render/core";
import type { StateStore } from "@json-render/core";

/**
 * A single state change, emitted to `onStateChange` subscribers. Matches the
 * baseline renderers' delta shape.
 */
export interface StateChange {
  path: string;
  value: unknown;
}

/**
 * Reactive state store for the renderer. Backed by an Angular signal so
 * components re-render on the exact paths they depend on (via {@link watch}).
 *
 * Supports an optional external {@link StateStore} (Redux / Zustand / Jotai /
 * XState adapters from the json-render ecosystem). When one is connected, reads
 * and writes are delegated to it and its `subscribe` drives the internal signal.
 */
@Injectable()
export class SpecStateService {
  private readonly _state: WritableSignal<StateModel> = signal<StateModel>({});
  private readonly _watched = new Map<string, Signal<unknown>>();

  private externalStore: StateStore | null = null;
  private externalUnsubscribe: (() => void) | null = null;

  /** Listeners notified with the delta(s) produced by each write. */
  private readonly changeListeners = new Set<
    (changes: StateChange[]) => void
  >();

  readonly state = this._state.asReadonly();

  /**
   * Connect an external store. All reads/writes delegate to it and its updates
   * are mirrored into the internal signal so the renderer stays reactive.
   */
  connectStore(store: StateStore): void {
    this.disconnectStore();
    this.externalStore = store;
    this._state.set(store.getSnapshot());
    this.externalUnsubscribe = store.subscribe(() => {
      this._state.set(store.getSnapshot());
    });
  }

  disconnectStore(): void {
    this.externalUnsubscribe?.();
    this.externalUnsubscribe = null;
    this.externalStore = null;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  onChange(listener: (changes: StateChange[]) => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  get(path: string): unknown {
    if (this.externalStore) {
      return this.externalStore.get(path);
    }
    return getByPath(this._state(), path);
  }

  /**
   * Return a memoized signal tracking a single JSON-pointer path. Repeated calls
   * for the same path return the same signal so downstream `computed`s dedupe.
   */
  watch(path: string): Signal<unknown> {
    const existing = this._watched.get(path);
    if (existing) {
      return existing;
    }
    const created = computed(() => getByPath(this._state(), path));
    this._watched.set(path, created);
    return created;
  }

  set(path: string, value: unknown): void {
    if (this.externalStore) {
      this.externalStore.set(path, value);
    } else {
      this._state.update((prev) => {
        const next = { ...prev };
        setByPath(next, path, value);
        return next;
      });
    }
    this.emitChanges([{ path, value }]);
  }

  applyUpdater(
    updater: (prev: Record<string, unknown>) => Record<string, unknown>,
  ): void {
    if (this.externalStore) {
      const next = updater(this.externalStore.getSnapshot());
      this.externalStore.update(next as Record<string, unknown>);
    } else {
      this._state.update((prev) => updater(prev));
    }
    // An updater is opaque; report a root-level change so subscribers refresh.
    this.emitChanges([{ path: "", value: this._state() }]);
  }

  update(updates: Record<string, unknown>): void {
    if (this.externalStore) {
      this.externalStore.update(updates);
    } else {
      this._state.update((prev) => {
        const next = { ...prev };
        for (const [path, value] of Object.entries(updates)) {
          setByPath(next, path, value);
        }
        return next;
      });
    }
    this.emitChanges(
      Object.entries(updates).map(([path, value]) => ({ path, value })),
    );
  }

  initialize(initialState: StateModel): void {
    this._watched.clear();
    if (this.externalStore) {
      this.externalStore.update(initialState as Record<string, unknown>);
    } else {
      this._state.set({ ...initialState });
    }
  }

  mergeInitialState(state: StateModel): void {
    if (this.externalStore) {
      this.externalStore.update(state as Record<string, unknown>);
    } else {
      this._state.update((prev) => ({ ...prev, ...state }));
    }
  }

  private emitChanges(changes: StateChange[]): void {
    if (this.changeListeners.size === 0) {
      return;
    }
    for (const listener of this.changeListeners) {
      listener(changes);
    }
  }
}

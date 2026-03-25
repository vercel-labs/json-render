import {
  Component,
  Injectable,
  InjectionToken,
  Input,
  Signal,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  createStateStore,
  getByPath,
  type StateModel,
  type StateStore,
} from "@json-render/core";
import { flattenToPointers } from "@json-render/core/store-utils";

export interface StateContextValue {
  state: Signal<StateModel>;
  get: (path: string) => unknown;
  set: (path: string, value: unknown) => void;
  update: (updates: Record<string, unknown>) => void;
  getSnapshot: () => StateModel;
}

export interface StateProviderProps {
  store?: StateStore;
  initialState?: StateModel;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
}

export const STATE_CONTEXT = new InjectionToken<StateContextValue>(
  "json-render:state",
);

@Injectable()
class StateContextService implements StateContextValue {
  readonly state = signal<StateModel>({});

  private activeStore: StateStore = createStateStore({});
  private activeExternalStore?: StateStore;
  private unsubscribe?: () => void;
  private onStateChange?: StateProviderProps["onStateChange"];
  private isControlled = false;
  private previousInitialFlat: Record<string, unknown> = {};

  configure({
    store,
    initialState,
    onStateChange,
  }: StateProviderProps = {}): void {
    this.onStateChange = onStateChange;
    const nextControlled = Boolean(store);

    if (
      !this.unsubscribe ||
      this.activeExternalStore !== store ||
      this.isControlled !== nextControlled
    ) {
      this.unsubscribe?.();
      this.isControlled = nextControlled;
      this.activeExternalStore = store;
      this.activeStore = store ?? createStateStore(initialState ?? {});
      this.unsubscribe = this.activeStore.subscribe(() => {
        this.state.set(this.activeStore.getSnapshot());
      });
      this.state.set(this.activeStore.getSnapshot());
    }

    if (!nextControlled) {
      let nextFlat: Record<string, unknown> = {};
      if (initialState && Object.keys(initialState).length > 0) {
        nextFlat = flattenToPointers(initialState);
      }
      const allKeys = new Set([
        ...Object.keys(this.previousInitialFlat),
        ...Object.keys(nextFlat),
      ]);
      const updates: Record<string, unknown> = {};
      for (const key of allKeys) {
        if (this.previousInitialFlat[key] !== nextFlat[key]) {
          updates[key] = key in nextFlat ? nextFlat[key] : undefined;
        }
      }
      this.previousInitialFlat = nextFlat;
      if (Object.keys(updates).length > 0) {
        this.activeStore.update(updates);
      }
    } else {
      this.previousInitialFlat = {};
    }
  }

  get(path: string): unknown {
    return this.activeStore.get(path);
  }

  set(path: string, value: unknown): void {
    const prev = this.activeStore.getSnapshot();
    this.activeStore.set(path, value);
    if (!this.isControlled && this.activeStore.getSnapshot() !== prev) {
      this.onStateChange?.([{ path, value }]);
    }
  }

  update(updates: Record<string, unknown>): void {
    const prev = this.activeStore.getSnapshot();
    this.activeStore.update(updates);
    if (!this.isControlled && this.activeStore.getSnapshot() !== prev) {
      const changes = Object.entries(updates)
        .filter(([path, value]) => getByPath(prev, path) !== value)
        .map(([path, value]) => ({ path, value }));
      if (changes.length > 0) {
        this.onStateChange?.(changes);
      }
    }
  }

  getSnapshot(): StateModel {
    return this.activeStore.getSnapshot();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}

@Component({
  selector: "json-render-state-provider",
  standalone: true,
  template: `<ng-content />`,
  providers: [
    StateContextService,
    {
      provide: STATE_CONTEXT,
      useExisting: StateContextService,
    },
  ],
})
export class StateProvider {
  private readonly ctx = inject(StateContextService);

  @Input() store?: StateStore;
  @Input() initialState?: StateModel;
  @Input() onStateChange?: (
    changes: Array<{ path: string; value: unknown }>,
  ) => void;

  ngOnInit(): void {
    this.sync();
  }

  ngOnChanges(): void {
    this.sync();
  }

  ngOnDestroy(): void {
    this.ctx.destroy();
  }

  private sync(): void {
    this.ctx.configure({
      store: this.store,
      initialState: this.initialState,
      onStateChange: this.onStateChange,
    });
  }
}

export function useStateStore(): StateContextValue {
  return inject(STATE_CONTEXT);
}

export function useStateValue<T>(path: string): Signal<T | undefined> {
  const { state } = useStateStore();
  return computed(() => getByPath(state(), path) as T | undefined);
}

export function useStateBinding<T>(
  path: string,
): [Signal<T | undefined>, (value: T) => void] {
  const { set } = useStateStore();
  const value = useStateValue<T>(path);

  function setBoundValue(nextValue: T): void {
    set(path, nextValue);
  }

  return [value, setBoundValue];
}

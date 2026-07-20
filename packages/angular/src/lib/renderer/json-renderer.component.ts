import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
} from "@angular/core";
import type { Spec, StateModel, StateStore } from "@json-render/core";

import { ElementRendererComponent } from "./element-renderer.component";
import { JSON_RENDER_VALIDATION_FUNCTIONS } from "../registry/registry.token";
import { ActionDispatcherService } from "../services/action-dispatcher.service";
import {
  SpecStateService,
  type StateChange,
} from "../services/spec-state.service";
import { ValidationService } from "../services/validation.service";
import { VisibilityService } from "../services/visibility.service";

/**
 * Root renderer. Give it a {@link Spec} and it materializes the element tree as
 * live Angular components. Provides the scoped state/visibility/action/validation
 * services so projected content (e.g. a confirm dialog) shares the same DI scope.
 *
 * ```html
 * <json-render [spec]="spec()" (stateChange)="onChange($event)">
 *   <json-render-confirm-dialog />
 * </json-render>
 * ```
 */
@Component({
  selector: "json-render",
  standalone: true,
  imports: [ElementRendererComponent],
  template: `
    @if (rootElement(); as root) {
      <json-render-element
        [element]="root"
        [spec]="spec()!"
        [loading]="loading()"
      />
    }
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    SpecStateService,
    VisibilityService,
    ActionDispatcherService,
    ValidationService,
  ],
})
export class JsonRendererComponent {
  /** The spec to render. */
  readonly spec = input<Spec | null>(null);
  /** Loading flag threaded to components and suppressing missing-child warnings. */
  readonly loading = input<boolean>(false);
  /** Initial state merged into the store on first render. */
  readonly initialState = input<StateModel>({});
  /**
   * Optional external state store (Redux / Zustand / Jotai / XState adapters).
   * When provided, all reads/writes delegate to it.
   */
  readonly store = input<StateStore | null>(null);
  /**
   * Callback invoked with the change delta(s) on every state write. Matches the
   * baseline renderers' `onStateChange` shape: `Array<{ path, value }>`.
   */
  readonly onStateChange = input<
    ((changes: StateChange[]) => void) | undefined
  >(undefined);

  private readonly stateService = inject(SpecStateService);
  private readonly validationService = inject(ValidationService);
  private readonly validationFunctions = inject(
    JSON_RENDER_VALIDATION_FUNCTIONS,
    { optional: true },
  );
  private previousSpecState: Record<string, unknown> | undefined;
  private previousInitialState: string | undefined;
  private changeUnsubscribe: (() => void) | null = null;

  readonly rootElement = computed(() => {
    const s = this.spec();
    if (!s?.root) return null;
    return s.elements[s.root] ?? null;
  });

  constructor() {
    if (this.validationFunctions) {
      this.validationService.setCustomFunctions(this.validationFunctions);
    }

    effect(() => {
      const store = this.store();
      if (store) {
        this.stateService.connectStore(store);
      } else {
        this.stateService.disconnectStore();
      }
    });

    effect(() => {
      const initial = this.initialState();
      const serialized = JSON.stringify(initial);
      if (serialized !== this.previousInitialState) {
        this.previousInitialState = serialized;
        if (initial && Object.keys(initial).length > 0) {
          this.stateService.mergeInitialState(initial);
        }
      }
    });

    effect(() => {
      const s = this.spec();
      if (s?.state && s.state !== this.previousSpecState) {
        this.previousSpecState = s.state;
        if (Object.keys(s.state).length > 0) {
          this.stateService.mergeInitialState(s.state);
        }
      }
    });

    // Wire onStateChange to delta notifications from the store.
    effect(() => {
      const callback = this.onStateChange();
      this.changeUnsubscribe?.();
      this.changeUnsubscribe = callback
        ? this.stateService.onChange(callback)
        : null;
    });

    inject(DestroyRef).onDestroy(() => {
      this.changeUnsubscribe?.();
      this.stateService.disconnectStore();
    });
  }
}

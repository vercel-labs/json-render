import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  ErrorHandler,
  Injector,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
} from "@angular/core";
import type { ComponentRef, Type } from "@angular/core";
import {
  evaluateVisibility,
  getByPath,
  resolveBindings,
  resolveElementProps,
  splitRepeatVisibility,
} from "@json-render/core";
import type {
  ComputedFunction,
  DirectiveRegistry,
  PropResolutionContext,
  Spec,
  UIElement,
} from "@json-render/core";

import { ChildViewManager, type RepeatFilter } from "./child-view-manager";
import { collectElementStatePaths } from "./collect-element-state-paths";
import {
  buildRepeatContext,
  resolveChildrenOutlet,
} from "./element-context.util";
import {
  ElementErrorHandler,
  mountErrorFallback,
} from "./element-error-handler";
import { buildEventBinding } from "./element-event-binding";
import type { ElementEventBinding } from "./element-event-binding";
import {
  bindingsEqual,
  childrenKey,
  shallowEqualProps,
} from "./element-render-diff";
import type { AppliedSingle } from "./element-render-diff";
import {
  deriveFieldRegistration,
  withFieldValidation,
} from "./element-validation.util";
import { setupElementWatchers } from "./element-watch.util";
import type { WatchPrevValues } from "./element-watch.util";
import {
  JSON_RENDER_DIRECTIVES,
  JSON_RENDER_FALLBACK,
  JSON_RENDER_FUNCTIONS,
  JSON_RENDER_REGISTRY,
} from "../registry/registry.token";
import { ActionDispatcherService } from "../services/action-dispatcher.service";
import { RepeatScopeService } from "../services/repeat-scope.service";
import { SpecStateService } from "../services/spec-state.service";
import { ValidationService } from "../services/validation.service";
import { VisibilityService } from "../services/visibility.service";

interface SingleResolution {
  resolvedProps: Record<string, unknown>;
  bindings: Record<string, string> | undefined;
  componentClass: Type<unknown>;
}

const EMPTY_FUNCTIONS: Readonly<Record<string, ComputedFunction>> =
  Object.freeze({});
const EMPTY_DIRECTIVES: DirectiveRegistry = new Map();

/**
 * The recursive per-element rendering engine. One instance renders one spec
 * element: it subscribes to only the state paths the element depends on,
 * evaluates visibility, handles `repeat` (with keyed reconciliation and per-item
 * filtering), resolves props/bindings, and imperatively mounts the mapped
 * Angular component — reusing the existing `ComponentRef` across re-renders when
 * the component class is unchanged.
 *
 * Internal to the renderer; not part of the public API.
 */
@Component({
  selector: "json-render-element",
  standalone: true,
  template: "",
  host: { style: "display: contents" },
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ErrorHandler, useClass: ElementErrorHandler }],
})
export class ElementRendererComponent {
  readonly element = input.required<UIElement>();
  readonly spec = input.required<Spec>();
  readonly loading = input<boolean>(false);

  private readonly vcr = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly stateService = inject(SpecStateService);
  private readonly visibilityService = inject(VisibilityService);
  private readonly actionDispatcher = inject(ActionDispatcherService);
  private readonly validationService = inject(ValidationService, {
    optional: true,
  });
  private readonly repeatScope = inject(RepeatScopeService, { optional: true });
  private readonly registry = inject(JSON_RENDER_REGISTRY);
  private readonly fallbackComponent = inject(JSON_RENDER_FALLBACK, {
    optional: true,
  });
  private readonly functions =
    inject(JSON_RENDER_FUNCTIONS, { optional: true }) ?? EMPTY_FUNCTIONS;
  private readonly directives =
    inject(JSON_RENDER_DIRECTIVES, { optional: true }) ?? EMPTY_DIRECTIVES;

  private readonly children = new ChildViewManager(
    ElementRendererComponent,
    this.envInjector,
  );
  private componentRef: ComponentRef<unknown> | null = null;
  private applied: AppliedSingle | null = null;
  private appliedVisible = true;
  private appliedRepeat = false;
  private registeredFieldPath: string | null = null;
  private readonly dependencyPaths = computed(() =>
    collectElementStatePaths(this.element(), this.baseRepeatCtx()),
  );

  private readonly watchPrevValues: WatchPrevValues = new Map();

  constructor() {
    effect(() => this.render());
    effect(() =>
      setupElementWatchers(this.element(), {
        stateService: this.stateService,
        dispatcher: this.actionDispatcher,
        prev: this.watchPrevValues,
        repeatScope: this.repeatScope,
        functions: this.functions,
        directives: this.directives,
      }),
    );
    inject(DestroyRef).onDestroy(() => this.cleanup());
  }

  private render(): void {
    const element = this.element();
    const spec = this.spec();
    const loading = this.loading();

    for (const path of this.dependencyPaths()) {
      this.stateService.watch(path)();
    }
    const fullCtx = this.buildContext();

    if (element.repeat) {
      // B3: split the container's `visible` into a container-level gate
      // (`$state`) and a per-item filter (`$item`/`$index`).
      const { container, itemFilter } = splitRepeatVisibility(element.visible);
      if (container !== undefined && !evaluateVisibility(container, fullCtx)) {
        this.applyHidden();
        return;
      }
      this.renderRepeatDiffed(element, spec, loading, itemFilter);
      return;
    }

    if (
      element.visible !== undefined &&
      !evaluateVisibility(element.visible, fullCtx)
    ) {
      this.applyHidden();
      return;
    }
    this.renderSingle(element, spec, loading, fullCtx);
  }

  private baseRepeatCtx(): PropResolutionContext {
    const emptyCtx: PropResolutionContext = {
      stateModel: {},
      functions: this.functions,
      directives: this.directives,
    };
    return this.repeatScope
      ? buildRepeatContext(emptyCtx, this.repeatScope)
      : emptyCtx;
  }

  private buildContext(): PropResolutionContext {
    const baseCtx: PropResolutionContext = {
      ...this.visibilityService.ctx(),
      functions: this.functions,
      directives: this.directives,
    };
    return this.repeatScope
      ? buildRepeatContext(baseCtx, this.repeatScope)
      : baseCtx;
  }

  private applyHidden(): void {
    if (!this.appliedVisible && this.applied === null && !this.appliedRepeat) {
      return;
    }
    this.cleanup();
    this.appliedVisible = false;
    this.applied = null;
    this.appliedRepeat = false;
  }

  private renderSingle(
    element: UIElement,
    spec: Spec,
    loading: boolean,
    ctx: PropResolutionContext,
  ): void {
    const rawProps = element.props as Record<string, unknown>;
    const bindings = resolveBindings(rawProps, ctx);
    const resolvedProps = resolveElementProps(rawProps, ctx);
    const componentClass =
      this.registry[element.type] ?? this.fallbackComponent;
    if (!componentClass) {
      console.warn(
        `[json-render] No renderer for component type: "${element.type}"`,
      );
      return;
    }
    const next: SingleResolution = { resolvedProps, bindings, componentClass };
    if (this.canReuseSingle(componentClass)) {
      this.updateSingle(element, spec, loading, ctx, next);
      return;
    }
    this.createSingle(element, spec, loading, ctx, next);
  }

  private canReuseSingle(componentClass: Type<unknown>): boolean {
    return (
      this.componentRef !== null &&
      this.appliedVisible &&
      this.applied !== null &&
      !this.appliedRepeat &&
      this.applied.componentClass === componentClass
    );
  }

  private updateSingle(
    element: UIElement,
    spec: Spec,
    loading: boolean,
    ctx: PropResolutionContext,
    next: SingleResolution,
  ): void {
    const ref = this.componentRef;
    const prev = this.applied;
    if (!ref || !prev) {
      return;
    }
    try {
      if (!shallowEqualProps(next.resolvedProps, prev.resolvedProps)) {
        ref.setInput("element", { ...element, props: next.resolvedProps });
      }
      if (next.bindings && !bindingsEqual(next.bindings, prev.bindings)) {
        ref.setInput("bindings", next.bindings);
      }
      if (loading !== prev.loading) {
        ref.setInput("loading", loading);
      }
      const binding = this.resolveEventBinding(element, ctx, next.bindings);
      ref.setInput("emit", binding.emit);
      ref.setInput("on", binding.on);
      const nextChildrenKey = childrenKey(element.children);
      if (spec !== prev.spec || nextChildrenKey !== prev.childrenKey) {
        this.children.destroy();
        this.renderOwnChildren(element, spec, loading, ref);
      }

      this.applied = {
        ...next,
        loading,
        childrenKey: nextChildrenKey,
        spec,
      };
    } catch (error) {
      this.recoverWithFallback(error, `update "${element.type}"`);
    }
  }

  private createSingle(
    element: UIElement,
    spec: Spec,
    loading: boolean,
    ctx: PropResolutionContext,
    next: SingleResolution,
  ): void {
    this.cleanup();
    const resolvedElement: UIElement = {
      ...element,
      props: next.resolvedProps,
    };
    const binding = this.resolveEventBinding(element, ctx, next.bindings);
    try {
      const ref = this.vcr.createComponent(next.componentClass, {
        injector: this.injector,
        environmentInjector: this.envInjector,
      });
      this.componentRef = ref;
      ref.setInput("element", resolvedElement);
      ref.setInput("emit", binding.emit);
      ref.setInput("on", binding.on);
      if (next.bindings) {
        ref.setInput("bindings", next.bindings);
      }
      ref.setInput("loading", loading);
      this.renderOwnChildren(element, spec, loading, ref);
      this.appliedVisible = true;
      this.appliedRepeat = false;
      this.applied = {
        ...next,
        loading,
        childrenKey: childrenKey(element.children),
        spec,
      };
    } catch (error) {
      this.recoverWithFallback(error, `create "${element.type}"`);
    }
  }

  private renderOwnChildren(
    element: UIElement,
    spec: Spec,
    loading: boolean,
    ref: ComponentRef<unknown>,
  ): void {
    if (!element.children || element.children.length === 0) {
      return;
    }
    ref.changeDetectorRef.detectChanges();
    const outlet = resolveChildrenOutlet(ref.instance);
    this.children.renderChildren(
      element.children,
      spec,
      loading,
      outlet?.vcr ?? this.vcr,
    );
  }

  private renderRepeatDiffed(
    element: UIElement,
    spec: Spec,
    loading: boolean,
    itemFilter: ReturnType<typeof splitRepeatVisibility>["itemFilter"],
  ): void {
    if (this.componentRef !== null || this.applied !== null) {
      this.cleanup();
    }

    const items =
      (getByPath(this.stateService.state(), element.repeat!.statePath) as
        | unknown[]
        | undefined) ?? [];
    const filter: RepeatFilter | undefined =
      itemFilter === undefined
        ? undefined
        : {
            itemFilter,
            stateModel: this.stateService.state(),
          };
    try {
      this.children.renderRepeat(
        element,
        spec,
        loading,
        items,
        this.vcr,
        filter,
      );
      this.appliedVisible = true;
      this.applied = null;
      this.appliedRepeat = true;
    } catch (error) {
      this.recoverWithFallback(error, `repeat "${element.type}"`);
    }
  }

  private recoverWithFallback(error: unknown, context: string): void {
    this.cleanup();
    const { vcr, fallbackComponent, injector, envInjector } = this;
    this.componentRef = mountErrorFallback(
      { vcr, fallbackComponent, injector, envInjector },
      error,
      context,
    );
    this.appliedVisible = true;
    this.applied = null;
    this.appliedRepeat = false;
  }

  private resolveEventBinding(
    element: UIElement,
    ctx: PropResolutionContext,
    bindings: Record<string, string> | undefined,
  ): ElementEventBinding {
    const binding = buildEventBinding(element, ctx, this.actionDispatcher);
    const registration = this.validationService
      ? deriveFieldRegistration(element, bindings)
      : null;
    if (!this.validationService || !registration) {
      this.unregisterField();
      return binding;
    }
    this.validationService.registerField(
      registration.path,
      registration.config,
    );
    this.registeredFieldPath = registration.path;
    return withFieldValidation(binding, registration, this.validationService);
  }

  private unregisterField(): void {
    if (this.registeredFieldPath && this.validationService) {
      this.validationService.unregisterField(this.registeredFieldPath);
      this.registeredFieldPath = null;
    }
  }

  private cleanup(): void {
    this.unregisterField();
    this.children.destroy();
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = null;
    }
    this.vcr.clear();
  }
}

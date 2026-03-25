import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  Signal,
  Type,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import type {
  ActionHandler,
  Catalog,
  ComputedFunction,
  SchemaDefinition,
  Spec,
  StateModel,
  StateStore,
  UIElement,
} from "@json-render/core";
import {
  createStateStore,
  executeAction as executeResolvedAction,
  evaluateVisibility,
  getByPath,
  resolveAction,
  resolveActionParam,
  resolveBindings,
  resolveElementProps,
  type ActionBinding,
  type PropResolutionContext,
} from "@json-render/core";
import type {
  Actions,
  CatalogHasActions,
  Components,
  EventHandle,
  SetState,
} from "./catalog-types";
import type { VNode } from "./vnode";
import { normalizeVNodeArray } from "./vnode";
import {
  ACTIONS_CONTEXT,
  ActionProvider,
  ConfirmDialog,
  deepResolveValue,
  type ActionContextValue,
} from "./providers/actions";
import { RepeatScopeProvider } from "./providers/repeat-scope";
import {
  STATE_CONTEXT,
  StateProvider,
  type StateContextValue,
} from "./providers/state";
import { ValidationProvider } from "./providers/validation";
import { VisibilityProvider } from "./providers/visibility";

export interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  props: P;
  emit: (event: string) => void | Promise<void>;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
  children?: VNode[];
}

export type ComponentRenderer<P = Record<string, unknown>> = (
  ctx: ComponentRenderProps<P>,
) => VNode | VNode[] | string | null;

export type ComponentRegistry = Record<string, ComponentRenderer>;

export interface RendererProps {
  spec: Spec | null;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
  store?: StateStore;
  initialState?: Record<string, unknown>;
  handlers?: Record<string, ActionHandler>;
  navigate?: (path: string) => void;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  functions?: Record<string, ComputedFunction>;
}

export interface JSONUIProviderProps {
  registry: ComponentRegistry;
  store?: StateStore;
  initialState?: Record<string, unknown>;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  navigate?: (path: string) => void;
  validationFunctions?: Record<
    string,
    (value: unknown, args?: Record<string, unknown>) => boolean
  >;
  functions?: Record<string, ComputedFunction>;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
}

interface RepeatScope {
  item: unknown;
  index: number;
  basePath: string;
}

interface FocusSnapshot {
  path: number[];
  selectionStart: number | null;
  selectionEnd: number | null;
  selectionDirection: "forward" | "backward" | "none" | null;
}

function getNodePath(root: Node, node: Node): number[] | null {
  const path: number[] = [];
  let current: Node | null = node;

  while (current && current !== root) {
    const nextParent: Node | null = current.parentNode;
    if (!nextParent) return null;
    const index = Array.prototype.indexOf.call(
      nextParent.childNodes,
      current,
    ) as number;
    if (index < 0) return null;
    path.unshift(index);
    current = nextParent;
  }

  return current === root ? path : null;
}

function captureFocusSnapshot(
  root: HTMLElement,
  document: Document,
): FocusSnapshot | null {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    if (!root.contains(active)) return null;
    const path = getNodePath(root, active);
    if (!path) return null;
    return {
      path,
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
      selectionDirection: active.selectionDirection,
    };
  }

  return null;
}

function getNodeByPath(root: Node, path: number[]): Node | null {
  let current: Node | null = root;
  for (const index of path) {
    if (!current) return null;
    current = current.childNodes.item(index);
  }
  return current;
}

function restoreFocusSnapshot(
  root: HTMLElement,
  snapshot: FocusSnapshot,
): boolean {
  const target = getNodeByPath(root, snapshot.path);

  if (
    !target ||
    (!(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement))
  ) {
    return false;
  }

  target.focus();
  if (snapshot.selectionStart !== null && snapshot.selectionEnd !== null) {
    target.setSelectionRange(
      snapshot.selectionStart,
      snapshot.selectionEnd,
      snapshot.selectionDirection ?? undefined,
    );
  }
  return true;
}

function noopHandle(): EventHandle {
  return {
    emit: () => {},
    shouldPreventDefault: false,
    bound: false,
  };
}

async function resolveAndExecuteBindings(
  actionBindings: ActionBinding[],
  ctx: PropResolutionContext,
  getSnapshot: () => Record<string, unknown>,
  execute: (binding: ActionBinding) => Promise<void>,
): Promise<void> {
  for (const binding of actionBindings) {
    if (!binding.params) {
      await execute(binding);
      continue;
    }
    const liveCtx: PropResolutionContext = {
      ...ctx,
      stateModel: getSnapshot(),
    };
    const resolvedParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(binding.params)) {
      resolvedParams[key] = resolveActionParam(value, liveCtx);
    }
    await execute({ ...binding, params: resolvedParams });
  }
}

function appendStyle(
  element: HTMLElement,
  styles: Record<string, unknown> | string,
): void {
  if (typeof styles === "string") {
    element.setAttribute("style", styles);
    return;
  }
  for (const [key, value] of Object.entries(styles)) {
    if (value === null || value === undefined) continue;
    element.style.setProperty(
      key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`),
      String(value),
    );
  }
}

function setDomProp(element: HTMLElement, key: string, value: unknown): void {
  if (value === null || value === undefined || value === false) return;

  if (key === "className" || key === "class") {
    element.setAttribute("class", String(value));
    return;
  }

  if (key === "style" && typeof value === "object") {
    appendStyle(element, value as Record<string, unknown>);
    return;
  }

  if (key === "style" && typeof value === "string") {
    appendStyle(element, value);
    return;
  }

  if (key === "dataset" && typeof value === "object" && value !== null) {
    for (const [dataKey, dataValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (dataValue !== null && dataValue !== undefined) {
        element.dataset[dataKey] = String(dataValue);
      }
    }
    return;
  }

  if (key.startsWith("on") && key.length > 2 && typeof value === "function") {
    // Preserve case for custom events (e.g., catChange from oncatChange)
    // Standard DOM events are all lowercase, custom events may have uppercase
    const eventName = key.slice(2);
    element.addEventListener(eventName, value as EventListener);
    return;
  }

  if (key === "innerHTML") {
    element.innerHTML = String(value);
    return;
  }

  if (
    key in element &&
    !key.startsWith("aria-") &&
    !key.startsWith("data-") &&
    typeof value !== "object"
  ) {
    Reflect.set(element, key, value);
    return;
  }

  element.setAttribute(key, value === true ? "" : String(value));
}

function renderVNode(
  document: Document,
  parent: Node,
  vnode: VNode,
  registry: ComponentRegistry,
  fallback: ComponentRenderer | undefined,
  loading: boolean | undefined,
): void {
  if (vnode === null || vnode === undefined || vnode === false) return;

  if (typeof vnode === "string" || typeof vnode === "number") {
    parent.appendChild(document.createTextNode(String(vnode)));
    return;
  }

  if (typeof vnode === "boolean") {
    return;
  }

  if (vnode.kind === "text") {
    parent.appendChild(document.createTextNode(vnode.value));
    return;
  }

  if (vnode.kind === "fragment") {
    for (const child of vnode.children) {
      renderVNode(document, parent, child, registry, fallback, loading);
    }
    return;
  }

  if (vnode.kind === "component") {
    const componentRenderer = registry[vnode.name] ?? fallback;
    if (!componentRenderer) {
      console.warn(
        `[json-render] No renderer for nested component type: ${vnode.name}`,
      );
      return;
    }
    const nested = componentRenderer({
      element: {
        type: vnode.name,
        props: vnode.props ?? {},
        children: [],
      },
      props: (vnode.props ?? {}) as Record<string, unknown>,
      emit: () => {},
      on: noopHandle,
      loading,
      children: vnode.children,
    });
    for (const child of normalizeVNodeArray(nested)) {
      renderVNode(document, parent, child, registry, fallback, loading);
    }
    return;
  }

  const element = document.createElement(vnode.tag);
  for (const [key, value] of Object.entries(vnode.props ?? {})) {
    setDomProp(element, key, value);
  }
  for (const child of vnode.children ?? []) {
    renderVNode(document, element, child, registry, fallback, loading);
  }
  parent.appendChild(element);
}

@Component({
  selector: "json-ui-provider",
  standalone: true,
  imports: [
    StateProvider,
    VisibilityProvider,
    ValidationProvider,
    ActionProvider,
    ConfirmDialog,
  ],
  template: `
    <json-render-state-provider
      [store]="store"
      [initialState]="initialState"
      [onStateChange]="onStateChange"
    >
      <json-render-visibility-provider>
        <json-render-validation-provider
          [customFunctions]="validationFunctions"
        >
          <json-render-action-provider
            [handlers]="handlers"
            [navigate]="navigate"
          >
            <ng-content />
            <json-render-confirm-dialog />
          </json-render-action-provider>
        </json-render-validation-provider>
      </json-render-visibility-provider>
    </json-render-state-provider>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class JSONUIProvider {
  @Input({ required: true }) registry!: ComponentRegistry;
  @Input() store?: StateStore;
  @Input() initialState?: Record<string, unknown>;
  @Input() handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  @Input() navigate?: (path: string) => void;
  @Input() validationFunctions?: Record<
    string,
    (value: unknown, args?: Record<string, unknown>) => boolean
  >;
  @Input() functions?: Record<string, ComputedFunction>;
  @Input() onStateChange?: (
    changes: Array<{ path: string; value: unknown }>,
  ) => void;
}

@Component({
  selector: "json-renderer",
  standalone: true,
  template: ``,
  encapsulation: ViewEncapsulation.None,
})
export class Renderer {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injectedState = inject(STATE_CONTEXT, { optional: true });
  private readonly injectedActions = inject(ACTIONS_CONTEXT, {
    optional: true,
  });
  private readonly watchedValues = new Map<string, Record<string, unknown>>();
  private readonly currentFunctions = signal<Record<string, ComputedFunction>>(
    {},
  );
  private readonly localStateSignal = signal<StateModel>({});
  private readonly localHandlers = signal<Record<string, ActionHandler>>({});
  private readonly localLoadingActions = signal<Set<string>>(new Set());

  private localStore: StateStore = createStateStore({});
  private localStoreUnsubscribe?: () => void;
  private localExternalStore?: StateStore;
  private localConfigured = false;

  @Input() spec: Spec | null = null;
  @Input({ required: true }) registry!: ComponentRegistry;
  @Input() loading?: boolean;
  @Input() fallback?: ComponentRenderer;
  @Input() functions?: Record<string, ComputedFunction>;
  @Input() store?: StateStore;
  @Input() initialState?: Record<string, unknown>;
  @Input() handlers?: Record<string, ActionHandler>;
  @Input() navigate?: (path: string) => void;
  @Input() onStateChange?: (
    changes: Array<{ path: string; value: unknown }>,
  ) => void;

  private readonly fallbackStateContext: StateContextValue = {
    state: this.localStateSignal,
    get: (path: string) => this.localStore.get(path),
    set: (path: string, value: unknown) => {
      const prev = this.localStore.getSnapshot();
      this.localStore.set(path, value);
      if (this.localStore.getSnapshot() !== prev) {
        this.onStateChange?.([{ path, value }]);
      }
    },
    update: (updates: Record<string, unknown>) => {
      const prev = this.localStore.getSnapshot();
      this.localStore.update(updates);
      if (this.localStore.getSnapshot() !== prev) {
        const changes = Object.entries(updates)
          .filter(([path, value]) => getByPath(prev, path) !== value)
          .map(([path, value]) => ({ path, value }));
        if (changes.length > 0) {
          this.onStateChange?.(changes);
        }
      }
    },
    getSnapshot: () => this.localStore.getSnapshot(),
  };

  private readonly fallbackActionContext: ActionContextValue = {
    handlers: computed(() => this.localHandlers()),
    loadingActions: this.localLoadingActions,
    pendingConfirmation: signal(null),
    execute: async (binding: ActionBinding) => {
      await this.executeLocalAction(binding);
    },
    confirm: () => {},
    cancel: () => {},
    registerHandler: (name: string, handler: ActionHandler) => {
      this.localHandlers.update((value) => ({ ...value, [name]: handler }));
    },
  };

  private get state(): StateContextValue {
    return this.injectedState ?? this.fallbackStateContext;
  }

  private get actions(): ActionContextValue {
    return this.injectedActions ?? this.fallbackActionContext;
  }

  constructor() {
    effect(() => {
      this.state.state();
      this.render();
    });
    this.destroyRef.onDestroy(() => {
      this.watchedValues.clear();
      this.localStoreUnsubscribe?.();
    });
  }

  ngOnChanges(): void {
    this.currentFunctions.set(this.functions ?? {});
    this.configureLocalContexts();
    this.render();
  }

  private configureLocalContexts(): void {
    if (this.injectedState) return;

    const desiredExternalStore = this.store;
    const shouldResetStore =
      !this.localConfigured || this.localExternalStore !== desiredExternalStore;

    if (shouldResetStore) {
      this.localStoreUnsubscribe?.();
      this.localExternalStore = desiredExternalStore;
      this.localStore =
        desiredExternalStore ??
        createStateStore(this.initialState ?? this.spec?.state ?? {});
      this.localStoreUnsubscribe = this.localStore.subscribe(() => {
        this.localStateSignal.set(this.localStore.getSnapshot());
      });
      this.localConfigured = true;
    }

    this.localHandlers.set(this.handlers ?? {});
    this.localStateSignal.set(this.localStore.getSnapshot());
  }

  private render(): void {
    const element = this.host.nativeElement;
    const document = element.ownerDocument;
    const focusSnapshot = captureFocusSnapshot(element, document);

    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    if (!this.spec?.root) return;

    const rootVNodes = this.renderElement(this.spec.root);
    for (const vnode of rootVNodes) {
      renderVNode(
        document,
        element,
        vnode,
        this.registry,
        this.fallback,
        this.loading,
      );
    }

    if (focusSnapshot) {
      restoreFocusSnapshot(element, focusSnapshot);
    }
  }

  private renderElement(
    elementKey: string,
    repeatScope?: RepeatScope,
  ): VNode[] {
    if (!this.spec) return [];
    const element = this.spec.elements[elementKey];
    if (!element) {
      if (!this.loading) {
        console.warn(
          `[json-render] Missing element "${elementKey}" referenced in spec.`,
        );
      }
      return [];
    }

    const ctx = this.buildContext(repeatScope);
    this.runWatchers(elementKey, element, ctx, repeatScope);

    if (!evaluateVisibility(element.visible, ctx)) {
      return [];
    }

    const rawProps = (element.props as Record<string, unknown>) ?? {};
    const bindings = resolveBindings(rawProps, ctx);
    const props = resolveElementProps(rawProps, ctx);
    const resolvedElement =
      props !== element.props ? { ...element, props } : element;

    const componentRenderer =
      this.registry[resolvedElement.type] ?? this.fallback;
    if (!componentRenderer) {
      console.warn(
        `[json-render] No renderer for component type: ${resolvedElement.type}`,
      );
      return [];
    }

    const emit = async (eventName: string): Promise<void> => {
      const binding = element.on?.[eventName];
      if (!binding) return;
      const actionBindings = Array.isArray(binding) ? binding : [binding];
      await resolveAndExecuteBindings(
        actionBindings,
        this.buildContext(repeatScope),
        this.state.getSnapshot,
        this.actions.execute,
      );
    };

    const on = (eventName: string): EventHandle => {
      const binding = element.on?.[eventName];
      if (!binding) return noopHandle();
      const actionBindings = Array.isArray(binding) ? binding : [binding];
      return {
        emit: () => emit(eventName),
        shouldPreventDefault: actionBindings.some(
          (item) => item.preventDefault,
        ),
        bound: true,
      };
    };

    const children = resolvedElement.repeat
      ? this.renderRepeatChildren(resolvedElement)
      : (resolvedElement.children ?? []).flatMap((childKey) =>
          this.renderElement(childKey, repeatScope),
        );

    const rendered = componentRenderer({
      element: resolvedElement as UIElement<string, Record<string, unknown>>,
      props: resolvedElement.props as Record<string, unknown>,
      emit,
      on,
      bindings,
      loading: this.loading,
      children,
    });

    return normalizeVNodeArray(rendered);
  }

  private renderRepeatChildren(element: UIElement): VNode[] {
    const repeat = element.repeat;
    if (!repeat?.statePath) return [];
    const items = this.state.get(repeat.statePath);
    if (!Array.isArray(items)) return [];

    return items.flatMap((item, index) => {
      const repeatScope: RepeatScope = {
        item,
        index,
        basePath: `${repeat.statePath}/${index}`,
      };
      return (element.children ?? []).flatMap((childKey) =>
        this.renderElement(childKey, repeatScope),
      );
    });
  }

  private runWatchers(
    elementKey: string,
    element: UIElement,
    ctx: PropResolutionContext,
    repeatScope?: RepeatScope,
  ): void {
    if (!element.watch) return;
    const watchKey = repeatScope
      ? `${elementKey}:${repeatScope.basePath}`
      : elementKey;
    const current: Record<string, unknown> = {};
    for (const path of Object.keys(element.watch)) {
      current[path] = getByPath(this.state.state(), path);
    }

    const previous = this.watchedValues.get(watchKey);
    this.watchedValues.set(watchKey, current);
    if (!previous) return;

    for (const path of Object.keys(element.watch)) {
      if (previous[path] === current[path]) continue;
      const binding = element.watch[path];
      if (!binding) continue;
      const bindings = Array.isArray(binding) ? binding : [binding];
      void resolveAndExecuteBindings(
        bindings,
        ctx,
        this.state.getSnapshot,
        this.actions.execute,
      );
    }
  }

  private buildContext(repeatScope?: RepeatScope): PropResolutionContext {
    return {
      stateModel: this.state.getSnapshot(),
      repeatItem: repeatScope?.item,
      repeatIndex: repeatScope?.index,
      repeatBasePath: repeatScope?.basePath,
      functions: this.currentFunctions(),
    };
  }

  private async executeLocalAction(binding: ActionBinding): Promise<void> {
    const resolved = resolveAction(binding, this.state.getSnapshot());

    if (resolved.action === "setState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      if (statePath) {
        this.state.set(statePath, resolved.params.value);
      }
      return;
    }

    if (resolved.action === "pushState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      if (statePath) {
        const current =
          (this.state.get(statePath) as unknown[] | undefined) ?? [];
        const nextValue = deepResolveValue(
          resolved.params.value,
          this.state.get,
        );
        this.state.set(statePath, [...current, nextValue]);
        const clearStatePath = resolved.params.clearStatePath as
          | string
          | undefined;
        if (clearStatePath) {
          this.state.set(clearStatePath, "");
        }
      }
      return;
    }

    if (resolved.action === "removeState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      const index = resolved.params.index as number;
      const current =
        (this.state.get(statePath) as unknown[] | undefined) ?? [];
      if (statePath && Number.isInteger(index)) {
        this.state.set(
          statePath,
          current.filter((_value, currentIndex) => currentIndex !== index),
        );
      }
      return;
    }

    if (resolved.action === "validateForm") {
      console.warn(
        "validateForm requires ValidationProvider when using the standalone Angular renderer.",
      );
      return;
    }

    if (resolved.action === "push" && resolved.params) {
      const screen = resolved.params.screen as string;
      if (screen) {
        const currentScreen = this.state.get("/currentScreen") as
          | string
          | undefined;
        const navStack =
          (this.state.get("/navStack") as string[] | undefined) ?? [];
        this.state.set("/navStack", [...navStack, currentScreen ?? ""]);
        this.state.set("/currentScreen", screen);
      }
      return;
    }

    if (resolved.action === "pop") {
      const navStack =
        (this.state.get("/navStack") as string[] | undefined) ?? [];
      if (navStack.length > 0) {
        const previousScreen = navStack[navStack.length - 1];
        this.state.set("/navStack", navStack.slice(0, -1));
        this.state.set("/currentScreen", previousScreen);
      }
      return;
    }

    const handler = this.localHandlers()[resolved.action];
    if (!handler) {
      console.warn(`No handler registered for action: ${resolved.action}`);
      return;
    }

    if (resolved.confirm) {
      if (
        typeof window !== "undefined" &&
        typeof window.confirm === "function"
      ) {
        const title = resolved.confirm.title?.trim() ?? "";
        const message = resolved.confirm.message?.trim() ?? "";
        const confirmed = window.confirm(
          [title, message].filter(Boolean).join("\n\n"),
        );
        if (!confirmed) return;
      }
    }

    this.localLoadingActions.update((value) => {
      const next = new Set(value);
      next.add(resolved.action);
      return next;
    });

    try {
      await executeResolvedAction({
        action: resolved,
        handler,
        setState: this.state.set,
        navigate: this.navigate,
        executeAction: async (name) => {
          await this.executeLocalAction({ action: name });
        },
      });
    } finally {
      this.localLoadingActions.update((value) => {
        const next = new Set(value);
        next.delete(resolved.action);
        return next;
      });
    }
  }
}

export interface DefineRegistryResult {
  registry: ComponentRegistry;
  handlers: (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ) => Record<string, (params: Record<string, unknown>) => Promise<void>>;
  executeAction: (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state?: StateModel,
  ) => Promise<void>;
}

type DefineRegistryOptions<C extends Catalog> = {
  components?: Components<C>;
} & (CatalogHasActions<C> extends true
  ? { actions: Actions<C> }
  : { actions?: Actions<C> });

type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: DefineRegistryOptions<C>,
): DefineRegistryResult {
  const registry: ComponentRegistry = {};

  if (options.components) {
    for (const [name, componentRenderer] of Object.entries(
      options.components,
    )) {
      registry[name] = componentRenderer as ComponentRenderer;
    }
  }

  const actionMap = options.actions
    ? (Object.entries(options.actions) as Array<
        [string, DefineRegistryActionFn]
      >)
    : [];

  const handlers = (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ): Record<string, (params: Record<string, unknown>) => Promise<void>> => {
    const result: Record<
      string,
      (params: Record<string, unknown>) => Promise<void>
    > = {};

    for (const [name, actionFn] of actionMap) {
      result[name] = async (params) => {
        const setState = getSetState();
        const state = getState();
        if (setState) {
          await actionFn(params, setState, state);
        }
      };
    }

    return result;
  };

  const executeAction = async (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state: StateModel = {},
  ): Promise<void> => {
    const entry = actionMap.find(([name]) => name === actionName);
    if (!entry) {
      console.warn(`Unknown action: ${actionName}`);
      return;
    }
    await entry[1](params, setState, state);
  };

  return { registry, handlers, executeAction };
}

export interface CreateRendererProps {
  spec: Spec | null;
  store?: StateStore;
  state?: Record<string, unknown>;
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  navigate?: (path: string) => void;
  functions?: Record<string, ComputedFunction>;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

export type ComponentMap<
  TComponents extends Record<string, { props: unknown }>,
> = {
  [K in keyof TComponents]: ComponentRenderer<TComponents[K]["props"]>;
};

export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  _catalog: Catalog<TDef, TCatalog>,
  components: ComponentMap<TCatalog["components"]>,
): Type<CreateRendererProps> {
  const registry = components as unknown as ComponentRegistry;

  @Component({
    selector: "json-render-catalog-renderer",
    standalone: true,
    imports: [JSONUIProvider, Renderer],
    template: `
      <json-ui-provider
        [registry]="registry"
        [store]="store"
        [initialState]="state"
        [handlers]="actionHandlers"
        [navigate]="navigate"
        [functions]="functions"
        [onStateChange]="onStateChange"
      >
        <json-renderer
          [spec]="spec"
          [registry]="registry"
          [loading]="loading"
          [fallback]="fallback"
          [store]="store"
          [initialState]="state"
          [handlers]="actionHandlers"
          [navigate]="navigate"
          [onStateChange]="onStateChange"
          [functions]="functions"
        />
      </json-ui-provider>
    `,
  })
  class CatalogRendererComponent implements CreateRendererProps {
    @Input() spec: Spec | null = null;
    @Input() store?: StateStore;
    @Input() state?: Record<string, unknown>;
    @Input() onAction?: (
      actionName: string,
      params?: Record<string, unknown>,
    ) => void;
    @Input() onStateChange?: (
      changes: Array<{ path: string; value: unknown }>,
    ) => void;
    @Input() navigate?: (path: string) => void;
    @Input() functions?: Record<string, ComputedFunction>;
    @Input() loading?: boolean;
    @Input() fallback?: ComponentRenderer;

    readonly registry = registry;

    readonly actionHandlers = new Proxy(
      {} as Record<string, (params: Record<string, unknown>) => void>,
      {
        get: (_target, prop: string) => {
          return (params: Record<string, unknown>) => {
            this.onAction?.(prop, params);
          };
        },
      },
    );
  }

  return CatalogRendererComponent;
}

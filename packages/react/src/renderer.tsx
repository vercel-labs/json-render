"use client";

import React, {
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  UIElement,
  Spec,
  ActionBinding,
  Catalog,
  SchemaDefinition,
  StateStore,
  ComputedFunction,
  DirectiveDefinition,
  DirectiveRegistry,
} from "@json-render/core";
import {
  resolveElementProps,
  resolveBindings,
  resolveActionParam,
  resolveRepeatItemStatePath,
  resolveRepeatStatePath,
  splitRepeatVisibility,
  evaluateVisibility,
  getByPath,
  isDevtoolsActive,
  subscribeDevtoolsActive,
  createDirectiveRegistry,
  type PropResolutionContext,
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import type {
  Components,
  Actions,
  ActionFn,
  SetState,
  StateModel,
  CatalogHasActions,
  EventHandle,
} from "./catalog-types";
import { useActions } from "./contexts/actions";
import { useStateSubscription } from "./contexts/state";
import { StateProvider } from "./contexts/state";
import { VisibilityProvider } from "./contexts/visibility";
import { ActionProvider } from "./contexts/actions";
import { ValidationProvider } from "./contexts/validation";
import { ConfirmDialog } from "./contexts/actions";
import { RepeatScopeProvider, useRepeatScope } from "./contexts/repeat-scope";

/**
 * Props passed to component renderers
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** The element being rendered */
  element: UIElement<string, P>;
  /** Rendered children */
  children?: ReactNode;
  slots?: Record<string, ReactNode>;
  /** Emit a named event. The renderer resolves the event to action binding(s) from the element's `on` field. Always provided by the renderer. */
  emit: (event: string) => void;
  /** Get an event handle with metadata (shouldPreventDefault, bound). Use when you need to inspect event bindings. */
  on: (event: string) => EventHandle;
  /**
   * Two-way binding paths resolved from `$bindState` / `$bindItem` expressions.
   * Maps prop name → absolute state path for write-back.
   * Only present when at least one prop uses `{ $bindState: "..." }` or `{ $bindItem: "..." }`.
   */
  bindings?: Record<string, string>;
  /** Whether the parent is loading */
  loading?: boolean;
}

/**
 * Component renderer type
 */
export type ComponentRenderer<P = Record<string, unknown>> = ComponentType<
  ComponentRenderProps<P>
>;

/**
 * Registry of component renderers
 */
export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

const registryMetadata = new WeakMap<
  ComponentRegistry,
  Record<string, { slots?: string[] }>
>();
const EMPTY_ELEMENT_PROPS: Record<string, unknown> = {};

/**
 * Props for the Renderer component
 */
export interface RendererProps {
  /** The UI spec to render */
  spec: Spec | null;
  /** Component registry */
  registry: ComponentRegistry;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

// ---------------------------------------------------------------------------
// ElementErrorBoundary – catches rendering errors in individual elements so
// a single bad component never crashes the whole page.
// ---------------------------------------------------------------------------

interface ElementErrorBoundaryProps {
  elementType: string;
  resetKey: number | undefined;
  children: ReactNode;
}

interface ElementErrorBoundaryState {
  hasError: boolean;
}

class ElementErrorBoundary extends React.Component<
  ElementErrorBoundaryProps,
  ElementErrorBoundaryState
> {
  constructor(props: ElementErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ElementErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[json-render] Rendering error in <${this.props.elementType}>:`,
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(previous: ElementErrorBoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      // Render nothing – the element silently disappears rather than
      // crashing the entire application.
      return null;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// FunctionsContext – provides $computed functions to the element tree
// ---------------------------------------------------------------------------

const EMPTY_FUNCTIONS: Record<string, ComputedFunction> = {};

const FunctionsContext =
  React.createContext<Record<string, ComputedFunction>>(EMPTY_FUNCTIONS);

function useFunctions(): Record<string, ComputedFunction> {
  return React.useContext(FunctionsContext);
}

// ---------------------------------------------------------------------------
// DirectivesContext – provides custom directive registry to the element tree
// ---------------------------------------------------------------------------

const DirectivesContext = React.createContext<DirectiveRegistry | undefined>(
  undefined,
);

function useDirectives(): DirectiveRegistry | undefined {
  return React.useContext(DirectivesContext);
}

interface ElementRendererProps {
  element: UIElement;
  /** Spec key for this element. Used by the devtools picker. */
  elementKey?: string;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
  signatures: Record<string, number>;
}

function stabilizeRecord<T extends Record<string, unknown> | undefined>(
  value: T,
  ref: React.MutableRefObject<T>,
): T {
  const previous = ref.current;
  if (previous === value) return previous;
  if (previous && value) {
    const keys = Object.keys(value);
    if (
      keys.length === Object.keys(previous).length &&
      keys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(previous, key) &&
          previous[key] === value[key],
      )
    ) {
      return previous;
    }
  }
  ref.current = value;
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function structurallyEqual(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  const previousIsArray = Array.isArray(previous);
  if (previousIsArray !== Array.isArray(next)) return false;
  if (
    !previousIsArray &&
    (previous === null ||
      next === null ||
      typeof previous !== "object" ||
      typeof next !== "object")
  ) {
    return false;
  }

  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const keys = Object.keys(nextRecord);
  if (
    (previousIsArray &&
      (previous as unknown[]).length !== (next as unknown[]).length) ||
    keys.length !== Object.keys(previousRecord).length
  ) {
    return false;
  }
  return keys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(previousRecord, key) &&
      structurallyEqual(previousRecord[key], nextRecord[key]),
  );
}

function snapshotStructuralValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  const snapshot: Record<string, unknown> | unknown[] = Array.isArray(value)
    ? new Array(value.length)
    : {};
  for (const key of Object.keys(value)) {
    (snapshot as Record<string, unknown>)[key] = snapshotStructuralValue(
      (value as Record<string, unknown>)[key],
    );
  }
  return snapshot;
}

function shareResolvedValue(previous: unknown, next: unknown): unknown {
  if (Object.is(previous, next)) return previous;
  const previousIsArray = Array.isArray(previous);
  if (previousIsArray !== Array.isArray(next)) return next;
  if (!previousIsArray && (!isPlainRecord(previous) || !isPlainRecord(next))) {
    return next;
  }

  // `next` can hold containers owned by the state model, directives, or
  // computed functions, so share into a copy instead of writing into it.
  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const keys = Object.keys(nextRecord);
  const shared: Record<string, unknown> | unknown[] = previousIsArray
    ? new Array((next as unknown[]).length)
    : {};
  let unchanged =
    (!previousIsArray ||
      (previous as unknown[]).length === (next as unknown[]).length) &&
    keys.length === Object.keys(previousRecord).length;
  for (const key of keys) {
    let value = nextRecord[key];
    if (Object.prototype.hasOwnProperty.call(previousRecord, key)) {
      value = shareResolvedValue(previousRecord[key], value);
      if (!Object.is(previousRecord[key], value)) unchanged = false;
    } else {
      unchanged = false;
    }
    (shared as Record<string, unknown>)[key] = value;
  }
  return unchanged ? previous : shared;
}

// ---------------------------------------------------------------------------
// State dependencies – each element subscribes to the state paths its
// expressions read, so a state change only re-runs the elements reading it.
// ---------------------------------------------------------------------------

const TEMPLATE_REFERENCE = /\$\{([^}]+)\}/g;

/** State paths an element reads; `null` means it may read any of them. */
type StateDeps = readonly string[] | null;

function collectStateDeps(
  sources: unknown[],
  repeatBasePath: string | undefined,
  directives: DirectiveRegistry | undefined,
  paths: string[] = [],
): StateDeps {
  const found = new Set(paths);
  const stack = [...sources];
  while (stack.length > 0) {
    const value = stack.pop();
    if (value === null || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (key === "$state" || key === "$bindState") {
        if (typeof nested === "string") found.add(nested);
      } else if (key === "$bindItem") {
        if (typeof nested === "string" && repeatBasePath != null) {
          found.add(
            nested === "" ? repeatBasePath : `${repeatBasePath}/${nested}`,
          );
        }
      } else if (key === "$template") {
        if (typeof nested !== "string") continue;
        // Bare names fall back to "/<name>" when the repeat item lacks them.
        for (const [, reference] of nested.matchAll(TEMPLATE_REFERENCE)) {
          found.add(reference!.startsWith("/") ? reference! : `/${reference}`);
        }
      } else if (directives?.has(key)) {
        // Custom directives resolve against the whole state model.
        return null;
      } else {
        stack.push(nested);
      }
    }
  }
  return [...found];
}

interface StateSelection {
  deps: StateDeps;
  snapshot: StateModel;
  values: unknown[];
}

/**
 * Subscribe to the store, re-rendering only when a value at one of `deps`
 * changes. Returns a snapshot that agrees with the live store at every path
 * in `deps`.
 */
function useStateModel(deps: StateDeps): StateModel {
  const { subscribe, getSnapshot, getServerSnapshot } = useStateSubscription();
  const selectionRef = useRef<StateSelection | null>(null);

  const select = (snapshot: StateModel): StateModel => {
    if (deps === null) return snapshot;
    const previous = selectionRef.current;
    if (previous && previous.deps === deps) {
      if (previous.snapshot === snapshot) return snapshot;
      if (
        deps.every((path, index) =>
          Object.is(getByPath(snapshot, path), previous.values[index]),
        )
      ) {
        return previous.snapshot;
      }
    }
    selectionRef.current = {
      deps,
      snapshot,
      values: deps.map((path) => getByPath(snapshot, path)),
    };
    return snapshot;
  };

  return useSyncExternalStore(
    subscribe,
    () => select(getSnapshot()),
    () => select(getServerSnapshot()),
  );
}

interface ElementSignatureEntry {
  own: UIElement;
  children: Array<[string, number]>;
  version: number;
}

interface ElementSignatureFrame {
  key: string;
  element: UIElement;
  children: string[];
  childIndex: number;
  childVersions: Array<[string, number]>;
}

function useElementSignatures(spec: Spec | null): Record<string, number> {
  const entriesRef = useRef<Record<string, ElementSignatureEntry>>({});
  const versionRef = useRef(0);
  if (!spec) return {};

  const previous = entriesRef.current;
  const next: Record<string, ElementSignatureEntry> = {};
  const signatures: Record<string, number> = {};
  const visiting = new Set<string>();

  for (const key of Object.keys(spec.elements)) {
    if (signatures[key] !== undefined) continue;
    const element = spec.elements[key];
    if (!element) continue;
    visiting.add(key);
    const stack: ElementSignatureFrame[] = [
      {
        key,
        element,
        children: [
          ...(element.children ?? []),
          ...Object.values(element.slots ?? {}).flat(),
        ],
        childIndex: 0,
        childVersions: [],
      },
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const childKey = frame.children[frame.childIndex];
      if (childKey !== undefined) {
        const childVersion = signatures[childKey];
        if (childVersion !== undefined) {
          frame.childVersions.push([childKey, childVersion]);
          frame.childIndex += 1;
          continue;
        }
        const childElement = spec.elements[childKey];
        if (!childElement || visiting.has(childKey)) {
          frame.childVersions.push([childKey, -1]);
          frame.childIndex += 1;
          continue;
        }
        visiting.add(childKey);
        stack.push({
          key: childKey,
          element: childElement,
          children: [
            ...(childElement.children ?? []),
            ...Object.values(childElement.slots ?? {}).flat(),
          ],
          childIndex: 0,
          childVersions: [],
        });
        continue;
      }

      const prior = previous[frame.key];
      const version =
        prior &&
        structurallyEqual(prior.own, frame.element) &&
        structurallyEqual(prior.children, frame.childVersions)
          ? prior.version
          : ++versionRef.current;
      visiting.delete(frame.key);
      next[frame.key] = {
        own: snapshotStructuralValue(frame.element) as UIElement,
        children: frame.childVersions,
        version,
      };
      signatures[frame.key] = version;
      stack.pop();
    }
  }
  entriesRef.current = next;
  return signatures;
}

interface CatalogComponentBoundaryProps {
  Component: ComponentRenderer;
  signature: number | undefined;
  execute: ReturnType<typeof useActions>["execute"];
  actionContext: ReturnType<typeof useRepeatScope>;
  functions: Record<string, ComputedFunction>;
  directives: DirectiveRegistry | undefined;
  element: UIElement;
  slots?: Record<string, ReactNode>;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
  children?: ReactNode;
}

const CatalogComponentBoundary = React.memo(
  function CatalogComponentBoundary({
    Component,
    element,
    slots,
    emit,
    on,
    bindings,
    loading,
    children,
  }: CatalogComponentBoundaryProps) {
    return (
      <Component
        element={element}
        slots={slots}
        emit={emit}
        on={on}
        bindings={bindings}
        loading={loading}
      >
        {children}
      </Component>
    );
  },
  (previous, next) =>
    previous.Component === next.Component &&
    previous.signature === next.signature &&
    previous.execute === next.execute &&
    previous.actionContext?.item === next.actionContext?.item &&
    previous.actionContext?.index === next.actionContext?.index &&
    previous.actionContext?.basePath === next.actionContext?.basePath &&
    previous.functions === next.functions &&
    previous.directives === next.directives &&
    previous.element.props === next.element.props &&
    previous.bindings === next.bindings &&
    previous.loading === next.loading,
);

/**
 * Subscribe to whether any devtools is mounted so the renderer can add a
 * `data-jr-key` wrapper for the picker. Trivially cheap when inactive.
 */
function useDevtoolsActive(): boolean {
  return React.useSyncExternalStore(
    subscribeDevtoolsActive,
    isDevtoolsActive,
    () => false,
  );
}

/**
 * Element renderer component.
 * Memoized to prevent re-rendering all repeat children when state changes.
 */
function ReactiveElementRenderer({
  element,
  elementKey,
  spec,
  registry,
  loading,
  fallback,
  signatures,
}: ElementRendererProps) {
  const devtoolsActive = useDevtoolsActive();
  const repeatScope = useRepeatScope();
  const { execute } = useActions();
  const { getSnapshot } = useStateSubscription();
  const functions = useFunctions();
  const directives = useDirectives();

  const repeatBasePath = repeatScope?.basePath;
  const stateDeps = useMemo(
    () =>
      collectStateDeps(
        [element.props, element.visible],
        repeatBasePath,
        directives,
        element.watch ? Object.keys(element.watch) : [],
      ),
    [element.props, element.visible, element.watch, repeatBasePath, directives],
  );
  const stateModel = useStateModel(stateDeps);
  const ctx: CoreVisibilityContext = useMemo(
    () => ({ stateModel }),
    [stateModel],
  );

  // Build context with repeat scope, $computed functions, and custom directives
  const fullCtx: PropResolutionContext = useMemo(() => {
    const base: PropResolutionContext = repeatScope
      ? {
          ...ctx,
          repeatItem: repeatScope.item,
          repeatIndex: repeatScope.index,
          repeatBasePath: repeatScope.basePath,
        }
      : { ...ctx };
    base.functions = functions;
    base.directives = directives;
    return base;
  }, [ctx, repeatScope, functions, directives]);

  // A repeat container whose own visible condition references $item/$index
  // outside any repeat scope is (partly) a per-item filter: models and humans
  // write {"repeat": ..., "visible": {"$item": "status", "eq": "todo"}} to
  // mean a filtered list. AND-composed $state conjuncts still gate the
  // container itself so a false gate hides the shell, not just the items.
  const repeatVisibility =
    element.repeat !== undefined && repeatScope == null
      ? splitRepeatVisibility(element.visible)
      : { container: element.visible, itemFilter: undefined };
  const repeatItemFilter = repeatVisibility.itemFilter;

  // Evaluate visibility (now supports $item/$index inside repeat scopes)
  const isVisible =
    repeatVisibility.container === undefined
      ? true
      : evaluateVisibility(repeatVisibility.container, fullCtx);

  // Create emit function that resolves events to action bindings.
  // Must be called before any early return to satisfy Rules of Hooks.
  const onBindings = element.on;
  const emit = useCallback(
    async (eventName: string) => {
      const binding = onBindings?.[eventName];
      if (!binding) return;
      const actionBindings = Array.isArray(binding) ? binding : [binding];
      for (const b of actionBindings) {
        if (!b.params) {
          await execute(b);
          continue;
        }
        // Build a fresh context with live store state so that $state
        // references in later actions see mutations from earlier ones.
        const liveCtx: PropResolutionContext = {
          ...fullCtx,
          stateModel: getSnapshot(),
        };
        const resolved: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(b.params)) {
          resolved[key] = resolveActionParam(val, liveCtx);
        }
        await execute({ ...b, params: resolved });
      }
    },
    [onBindings, execute, fullCtx, getSnapshot],
  );

  // Create on() function that returns an EventHandle with metadata for a specific event.
  const on = useCallback(
    (eventName: string): EventHandle => {
      const binding = onBindings?.[eventName];
      if (!binding) {
        return { emit: () => {}, shouldPreventDefault: false, bound: false };
      }
      const actionBindings = Array.isArray(binding) ? binding : [binding];
      const shouldPreventDefault = actionBindings.some((b) => b.preventDefault);
      return {
        emit: () => emit(eventName),
        shouldPreventDefault,
        bound: true,
      };
    },
    [onBindings, emit],
  );

  // Watch effect: fire actions when watched state paths change.
  // Must be called before any early return to satisfy Rules of Hooks.
  //
  // Two refs serve distinct roles:
  // - `stableWatchRef` (useMemo): holds the last emitted values object so we
  //   can return the same reference when watched values haven't changed,
  //   preventing the downstream useEffect from firing on unrelated state updates.
  // - `prevWatchValues` (useEffect): tracks the previous watched-values snapshot
  //   for change detection. Starts as `null` to skip the initial mount.
  const watchConfig = element.watch;
  const prevWatchValues = useRef<Record<string, unknown> | null>(null);
  const stableWatchRef = useRef<Record<string, unknown> | undefined>(undefined);
  const stableBindingsRef = useRef<Record<string, string> | undefined>(
    undefined,
  );
  const stableResolvedPropsRef = useRef<Record<string, unknown>>({});

  const watchedValues = useMemo(() => {
    if (!watchConfig) return undefined;
    const values: Record<string, unknown> = {};
    for (const path of Object.keys(watchConfig)) {
      values[path] = getByPath(stateModel, path);
    }
    const prev = stableWatchRef.current;
    if (prev) {
      const keys = Object.keys(values);
      if (
        keys.length === Object.keys(prev).length &&
        keys.every((k) => values[k] === prev[k])
      ) {
        return prev;
      }
    }
    stableWatchRef.current = values;
    return values;
  }, [watchConfig, stateModel]);

  useEffect(() => {
    if (!watchConfig || !watchedValues) return;
    const paths = Object.keys(watchConfig);
    if (paths.length === 0) return;

    const prev = prevWatchValues.current;
    prevWatchValues.current = watchedValues;

    // Skip the initial mount — only fire on changes
    if (prev === null) return;

    let cancelled = false;
    void (async () => {
      for (const path of paths) {
        if (cancelled) break;
        if (watchedValues[path] !== prev[path]) {
          const binding = watchConfig[path];
          if (!binding) continue;
          const bindings = Array.isArray(binding) ? binding : [binding];
          for (const b of bindings) {
            if (cancelled) break;
            if (!b.params) {
              await execute(b);
              if (cancelled) break;
              continue;
            }
            const liveCtx: PropResolutionContext = {
              ...fullCtx,
              stateModel: getSnapshot(),
            };
            const resolved: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(b.params)) {
              resolved[key] = resolveActionParam(val, liveCtx);
            }
            await execute({ ...b, params: resolved });
            if (cancelled) break;
          }
        }
      }
    })().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [watchConfig, watchedValues, execute, fullCtx, getSnapshot]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Resolve $bindState/$bindItem expressions → bindings map (prop name → state path)
  const rawProps =
    (element.props as Record<string, unknown> | undefined) ??
    EMPTY_ELEMENT_PROPS;
  const elementBindings = stabilizeRecord(
    resolveBindings(rawProps, fullCtx),
    stableBindingsRef,
  );

  // Resolve dynamic prop expressions ($state, $item, $index, $bindState, $bindItem, $cond/$then/$else)
  const resolvedProps = shareResolvedValue(
    stableResolvedPropsRef.current,
    resolveElementProps(rawProps, fullCtx),
  ) as Record<string, unknown>;
  stableResolvedPropsRef.current = resolvedProps;

  const resolvedElement =
    resolvedProps !== element.props
      ? { ...element, props: resolvedProps }
      : element;

  // Get the component renderer
  const Component = registry[resolvedElement.type] ?? fallback;

  if (!Component) {
    console.warn(`No renderer for component type: ${resolvedElement.type}`);
    return null;
  }

  const metadata = registryMetadata.get(registry)?.[resolvedElement.type];
  if (resolvedElement.slots && metadata?.slots) {
    const availableSlots = new Set(metadata.slots);
    for (const slotName of Object.keys(resolvedElement.slots)) {
      if (slotName === "default") {
        console.warn(
          `[json-render] Component "${resolvedElement.type}" uses slots.default. Use "children" for default slot content.`,
        );
      } else if (!availableSlots.has(slotName)) {
        console.warn(
          `[json-render] Unknown slot "${slotName}" on component "${resolvedElement.type}". Available slots: ${metadata.slots.join(", ")}`,
        );
      }
    }
  }

  const renderChildKeys = (childKeys: string[], slotName?: string) =>
    childKeys.map((childKey) => {
      const childElement = spec.elements[childKey];
      if (!childElement) {
        if (!loading) {
          const location = slotName
            ? `in slot "${slotName}" of "${resolvedElement.type}"`
            : `as child of "${resolvedElement.type}"`;
          console.warn(
            `[json-render] Missing element "${childKey}" referenced ${location}. This element will not render.`,
          );
        }
        return null;
      }
      return (
        <ElementRenderer
          key={childKey}
          element={childElement}
          elementKey={childKey}
          spec={spec}
          registry={registry}
          loading={loading}
          fallback={fallback}
          signatures={signatures}
        />
      );
    });

  const children = resolvedElement.repeat ? (
    <RepeatChildren
      element={resolvedElement}
      spec={spec}
      registry={registry}
      loading={loading}
      fallback={fallback}
      itemFilter={repeatItemFilter}
      signatures={signatures}
    />
  ) : resolvedElement.children ? (
    renderChildKeys(resolvedElement.children)
  ) : undefined;

  const slots = resolvedElement.slots
    ? Object.fromEntries(
        Object.entries(resolvedElement.slots).map(([slotName, childKeys]) => [
          slotName,
          renderChildKeys(childKeys, slotName),
        ]),
      )
    : undefined;

  const rendered = (
    <CatalogComponentBoundary
      Component={Component}
      signature={signatures[elementKey ?? ""]}
      execute={execute}
      actionContext={repeatScope}
      functions={functions}
      directives={directives}
      element={resolvedElement}
      slots={slots}
      emit={emit}
      on={on}
      bindings={elementBindings}
      loading={loading}
    >
      {children}
    </CatalogComponentBoundary>
  );

  // When devtools is mounted, wrap each element in a transparent span so the
  // picker can map DOM nodes back to spec keys. `display: contents` avoids
  // most layout impact.
  const tagged =
    devtoolsActive && elementKey ? (
      <span data-jr-key={elementKey} style={{ display: "contents" }}>
        {rendered}
      </span>
    ) : (
      rendered
    );

  return (
    <ElementErrorBoundary
      elementType={resolvedElement.type}
      resetKey={signatures[elementKey ?? ""]}
    >
      {tagged}
    </ElementErrorBoundary>
  );
}

const ElementRenderer = React.memo(
  function ElementRenderer(props: ElementRendererProps) {
    return <ReactiveElementRenderer {...props} />;
  },
  (previous, next) =>
    previous.elementKey === next.elementKey &&
    previous.signatures[previous.elementKey ?? ""] ===
      next.signatures[next.elementKey ?? ""] &&
    previous.registry === next.registry &&
    previous.loading === next.loading &&
    previous.fallback === next.fallback,
);

// ---------------------------------------------------------------------------
// RepeatChildren -- renders child elements once per item in a state array.
// Used when an element has a `repeat` field.
// ---------------------------------------------------------------------------

function RepeatChildren({
  element,
  spec,
  registry,
  loading,
  fallback,
  signatures,
  itemFilter,
}: {
  element: UIElement;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
  signatures: Record<string, number>;
  itemFilter?: UIElement["visible"];
}) {
  const parentScope = useRepeatScope();
  const directives = useDirectives();
  const repeat = element.repeat!;
  const statePath = resolveRepeatStatePath(
    repeat.statePath,
    parentScope?.basePath,
  );
  const stateDeps = useMemo(
    () =>
      statePath === undefined
        ? []
        : collectStateDeps([itemFilter], parentScope?.basePath, directives, [
            statePath,
          ]),
    [statePath, itemFilter, parentScope?.basePath, directives],
  );
  const stateModel = useStateModel(stateDeps);
  if (statePath === undefined) {
    console.warn(
      "[json-render] $item in repeat.statePath used outside of a repeat scope",
    );
    return null;
  }

  const items =
    (getByPath(stateModel, statePath) as unknown[] | undefined) ?? [];

  // Per-item filter from the container's own $item/$index visible condition.
  // Original indices are preserved so item state paths still point at the
  // right array entry.
  const entries = items
    .map((itemValue, index) => ({ itemValue, index }))
    .filter(
      ({ itemValue, index }) =>
        itemFilter === undefined ||
        evaluateVisibility(itemFilter, {
          stateModel,
          repeatItem: itemValue,
          repeatIndex: index,
        }),
    );

  return (
    <>
      {entries.map(({ itemValue, index }) => {
        // Use a stable key: prefer key field, fall back to index
        const key =
          repeat.key && typeof itemValue === "object" && itemValue !== null
            ? String(
                (itemValue as Record<string, unknown>)[repeat.key] ?? index,
              )
            : String(index);

        return (
          <RepeatScopeProvider
            key={key}
            item={itemValue}
            index={index}
            basePath={resolveRepeatItemStatePath(statePath, index)}
          >
            {element.children?.map((childKey) => {
              const childElement = spec.elements[childKey];
              if (!childElement) {
                if (!loading) {
                  console.warn(
                    `[json-render] Missing element "${childKey}" referenced as child of "${element.type}" (repeat). This element will not render.`,
                  );
                }
                return null;
              }
              return (
                <ElementRenderer
                  key={childKey}
                  element={childElement}
                  elementKey={childKey}
                  spec={spec}
                  registry={registry}
                  loading={loading}
                  fallback={fallback}
                  signatures={signatures}
                />
              );
            })}
          </RepeatScopeProvider>
        );
      })}
    </>
  );
}

/**
 * Main renderer component
 */
export function Renderer({ spec, registry, loading, fallback }: RendererProps) {
  const signatures = useElementSignatures(spec);
  if (!spec || !spec.root) {
    return null;
  }

  const rootElement = spec.elements[spec.root];
  if (!rootElement) {
    return null;
  }

  return (
    <ElementRenderer
      element={rootElement}
      elementKey={spec.root}
      spec={spec}
      registry={registry}
      loading={loading}
      fallback={fallback}
      signatures={signatures}
    />
  );
}

/**
 * Props for JSONUIProvider
 */
export interface JSONUIProviderProps {
  /** Component registry */
  registry: ComponentRegistry;
  /**
   * External store (controlled mode). When provided, `initialState` and
   * `onStateChange` are ignored.
   */
  store?: StateStore;
  /** Initial state model (uncontrolled mode) */
  initialState?: Record<string, unknown>;
  /** Action handlers */
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  /** Navigation function */
  navigate?: (path: string) => void;
  /** Custom validation functions */
  validationFunctions?: Record<
    string,
    (value: unknown, args?: Record<string, unknown>) => boolean
  >;
  /** Named functions for `$computed` expressions in props */
  functions?: Record<string, ComputedFunction>;
  /** Custom directives for user-defined `$`-prefixed dynamic values */
  directives?: DirectiveDefinition[];
  /** Callback when state changes (uncontrolled mode) */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  children: ReactNode;
}

/**
 * Combined provider for all JSONUI contexts
 */
export function JSONUIProvider({
  registry,
  store,
  initialState,
  handlers,
  navigate,
  validationFunctions,
  functions,
  directives,
  onStateChange,
  children,
}: JSONUIProviderProps) {
  const directiveRegistry = useMemo(
    () => (directives ? createDirectiveRegistry(directives) : undefined),
    [directives],
  );
  return (
    <StateProvider
      store={store}
      initialState={initialState}
      onStateChange={onStateChange}
    >
      <VisibilityProvider>
        <ValidationProvider customFunctions={validationFunctions}>
          <ActionProvider handlers={handlers} navigate={navigate}>
            <FunctionsContext.Provider value={functions ?? EMPTY_FUNCTIONS}>
              <DirectivesContext.Provider value={directiveRegistry}>
                {children}
                <ConfirmationDialogManager />
              </DirectivesContext.Provider>
            </FunctionsContext.Provider>
          </ActionProvider>
        </ValidationProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

/**
 * Renders the confirmation dialog when needed
 */
function ConfirmationDialogManager() {
  const { pendingConfirmation, confirm, cancel } = useActions();

  if (!pendingConfirmation?.action.confirm) {
    return null;
  }

  return (
    <ConfirmDialog
      confirm={pendingConfirmation.action.confirm}
      onConfirm={confirm}
      onCancel={cancel}
    />
  );
}

// ============================================================================
// defineRegistry
// ============================================================================

/**
 * Result returned by defineRegistry
 */
export interface DefineRegistryResult {
  /** Component registry for `<Renderer registry={...} />` */
  registry: ComponentRegistry;
  /**
   * Create ActionProvider-compatible handlers.
   * Accepts getter functions so handlers always read the latest state/setState
   * (e.g. from React refs).
   */
  handlers: (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ) => Record<string, (params: Record<string, unknown>) => Promise<void>>;
  /**
   * Execute an action by name imperatively
   * (for use outside the React tree, e.g. initial state loading).
   */
  executeAction: (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state?: StateModel,
  ) => Promise<void>;
}

/**
 * Options for defineRegistry.
 *
 * When the catalog declares actions, the `actions` field is required.
 * When the catalog has no actions (or `actions: {}`), the field is optional.
 */
type DefineRegistryOptions<C extends Catalog> = {
  components?: Components<C>;
} & (CatalogHasActions<C> extends true
  ? { actions: Actions<C> }
  : { actions?: Actions<C> });

/**
 * Create a registry from a catalog with components and/or actions.
 *
 * When the catalog declares actions, the `actions` field is required.
 *
 * @example
 * ```tsx
 * // Components only (catalog has no actions)
 * const { registry } = defineRegistry(catalog, {
 *   components: {
 *     Card: ({ props, children }) => (
 *       <div className="card">{props.title}{children}</div>
 *     ),
 *   },
 * });
 *
 * // Both (catalog declares actions)
 * const { registry, handlers, executeAction } = defineRegistry(catalog, {
 *   components: { ... },
 *   actions: { ... },
 * });
 * ```
 */
export function defineRegistry<C extends Catalog>(
  catalog: C,
  options: DefineRegistryOptions<C>,
): DefineRegistryResult {
  // Build component registry
  const registry: ComponentRegistry = {};
  if (options.components) {
    for (const [name, componentFn] of Object.entries(options.components)) {
      registry[name] = ({
        element,
        children,
        slots,
        emit,
        on,
        bindings,
        loading,
      }: ComponentRenderProps) => {
        return (componentFn as DefineRegistryComponentFn)({
          props: element.props,
          children,
          slots,
          emit,
          on,
          bindings,
          loading,
        });
      };
    }
  }
  const catalogComponents = (
    catalog.data as { components?: Record<string, { slots?: string[] }> }
  ).components;
  if (catalogComponents) {
    registryMetadata.set(registry, catalogComponents);
  }

  // Build action helpers
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
    if (entry) {
      await entry[1](params, setState, state);
    } else {
      console.warn(`Unknown action: ${actionName}`);
    }
  };

  return { registry, handlers, executeAction };
}

/** @internal */
type DefineRegistryComponentFn = (ctx: {
  props: unknown;
  children?: React.ReactNode;
  slots?: Record<string, React.ReactNode>;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}) => React.ReactNode;

/** @internal */
type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

// ============================================================================
// NEW API
// ============================================================================

/**
 * Props for renderers created with createRenderer
 */
export interface CreateRendererProps {
  /** The spec to render (AI-generated JSON) */
  spec: Spec | null;
  /**
   * External store (controlled mode). When provided, `state` and
   * `onStateChange` are ignored.
   */
  store?: StateStore;
  /** State context for dynamic values (uncontrolled mode) */
  state?: Record<string, unknown>;
  /** Action handler */
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  /** Callback when state changes (uncontrolled mode) */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  /** Named functions for `$computed` expressions in props */
  functions?: Record<string, ComputedFunction>;
  /** Custom directives for user-defined `$`-prefixed dynamic values */
  directives?: DirectiveDefinition[];
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

/**
 * Component map type - maps component names to React components
 */
export type ComponentMap<
  TComponents extends Record<string, { props: unknown }>,
> = {
  [K in keyof TComponents]: ComponentType<
    ComponentRenderProps<
      TComponents[K]["props"] extends { _output: infer O }
        ? O
        : Record<string, unknown>
    >
  >;
};

/**
 * Create a renderer from a catalog
 *
 * @example
 * ```typescript
 * const DashboardRenderer = createRenderer(dashboardCatalog, {
 *   Card: ({ element, children }) => <div className="card">{children}</div>,
 *   Metric: ({ element }) => <span>{element.props.value}</span>,
 * });
 *
 * // Usage
 * <DashboardRenderer spec={aiGeneratedSpec} state={state} />
 * ```
 */
export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  catalog: Catalog<TDef, TCatalog>,
  components: ComponentMap<TCatalog["components"]>,
): ComponentType<CreateRendererProps> {
  // Convert component map to registry
  const registry: ComponentRegistry =
    components as unknown as ComponentRegistry;
  const catalogComponents = (
    catalog.data as { components?: Record<string, { slots?: string[] }> }
  ).components;
  if (catalogComponents) {
    registryMetadata.set(registry, catalogComponents);
  }

  // Return the renderer component
  return function CatalogRenderer({
    spec,
    store,
    state,
    onAction,
    onStateChange,
    functions,
    directives,
    loading,
    fallback,
  }: CreateRendererProps) {
    const directiveRegistry = useMemo(
      () => (directives ? createDirectiveRegistry(directives) : undefined),
      [directives],
    );

    // Wrap onAction with a Proxy so any action name routes to the callback
    const actionHandlers = onAction
      ? new Proxy(
          {} as Record<
            string,
            (params: Record<string, unknown>) => void | Promise<void>
          >,
          {
            get: (_target, prop: string) => {
              return (params: Record<string, unknown>) =>
                onAction(prop, params);
            },
            has: () => true,
          },
        )
      : undefined;

    return (
      <StateProvider
        store={store}
        initialState={state}
        onStateChange={onStateChange}
      >
        <VisibilityProvider>
          <ValidationProvider>
            <ActionProvider handlers={actionHandlers}>
              <FunctionsContext.Provider value={functions ?? EMPTY_FUNCTIONS}>
                <DirectivesContext.Provider value={directiveRegistry}>
                  <Renderer
                    spec={spec}
                    registry={registry}
                    loading={loading}
                    fallback={fallback}
                  />
                  <ConfirmationDialogManager />
                </DirectivesContext.Provider>
              </FunctionsContext.Provider>
            </ActionProvider>
          </ValidationProvider>
        </VisibilityProvider>
      </StateProvider>
    );
  };
}

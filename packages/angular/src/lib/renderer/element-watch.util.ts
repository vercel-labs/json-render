import { resolveActionParam } from "@json-render/core";
import type {
  ActionBinding,
  ComputedFunction,
  DirectiveRegistry,
  PropResolutionContext,
  UIElement,
} from "@json-render/core";

import { buildRepeatContext } from "./element-context.util";
import type { ActionDispatcherService } from "../services/action-dispatcher.service";
import type { RepeatScopeService } from "../services/repeat-scope.service";
import type { SpecStateService } from "../services/spec-state.service";

export type WatchPrevValues = Map<string, unknown>;

export interface ElementWatchDeps {
  stateService: SpecStateService;
  dispatcher: ActionDispatcherService;
  prev: WatchPrevValues;
  repeatScope: RepeatScopeService | null;
  functions: Record<string, ComputedFunction>;
  directives: DirectiveRegistry;
}

/**
 * Evaluate an element's `watch` map. On the first run the current value is
 * seeded (no fire); subsequent runs fire the bound action(s) when the watched
 * value changes.
 */
export function setupElementWatchers(
  element: UIElement,
  deps: ElementWatchDeps,
): void {
  const watch = element.watch;
  if (!watch) {
    return;
  }
  const basePath = deps.repeatScope?.basePath ?? "";
  for (const [pointer, binding] of Object.entries(watch)) {
    evaluateWatch(pointer, binding, deps, basePath);
  }
}

function evaluateWatch(
  pointer: string,
  binding: ActionBinding | ActionBinding[],
  deps: ElementWatchDeps,
  basePath: string,
): void {
  const key = `${basePath}::${pointer}`;
  const nextValue = deps.stateService.watch(pointer)();

  if (!deps.prev.has(key)) {
    deps.prev.set(key, nextValue);
    return;
  }
  if (Object.is(deps.prev.get(key), nextValue)) {
    return;
  }
  deps.prev.set(key, nextValue);
  fireBindings(binding, deps);
}

function fireBindings(
  binding: ActionBinding | ActionBinding[],
  deps: ElementWatchDeps,
): void {
  const bindings = Array.isArray(binding) ? binding : [binding];
  const ctx = liveContext(deps);
  for (const b of bindings) {
    dispatchWatchBinding(b, ctx, deps.dispatcher);
  }
}

function dispatchWatchBinding(
  binding: ActionBinding,
  ctx: PropResolutionContext,
  dispatcher: ActionDispatcherService,
): void {
  if (!binding.params) {
    dispatcher.execute(binding).catch(onWatchDispatchError);
    return;
  }
  const resolved: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(binding.params)) {
    resolved[k] = resolveActionParam(val, ctx);
  }
  dispatcher
    .execute({ ...binding, params: resolved })
    .catch(onWatchDispatchError);
}

function onWatchDispatchError(error: unknown): void {
  console.debug(
    "[json-render] Watch action rejected (fire-and-forget):",
    error,
  );
}

function liveContext(deps: ElementWatchDeps): PropResolutionContext {
  const base: PropResolutionContext = {
    stateModel: deps.stateService.state(),
    functions: deps.functions,
    directives: deps.directives,
  };
  return deps.repeatScope ? buildRepeatContext(base, deps.repeatScope) : base;
}

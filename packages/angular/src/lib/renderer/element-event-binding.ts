import { resolveActionParam } from "@json-render/core";
import type {
  ActionBinding,
  PropResolutionContext,
  UIElement,
} from "@json-render/core";

import type { ActionDispatcherService } from "../services/action-dispatcher.service";
import type { EventHandle } from "../types/catalog-types";

export interface ElementEventBinding {
  emit: (eventName: string) => void;
  on: (eventName: string) => EventHandle;
}

/**
 * Build the `emit` / `on` accessors a component receives, wired to the element's
 * `on` action bindings. Params are resolved against the current context before
 * dispatch so `$state`/`$item` refs inside params work.
 */
export function buildEventBinding(
  element: UIElement,
  ctx: PropResolutionContext,
  dispatcher: ActionDispatcherService,
): ElementEventBinding {
  const onBindings = element.on;

  const emit = (eventName: string): void => {
    const binding = onBindings?.[eventName];
    if (!binding) {
      return;
    }
    const actionBindings: ActionBinding[] = Array.isArray(binding)
      ? binding
      : [binding];
    for (const b of actionBindings) {
      dispatchBinding(b, ctx, dispatcher);
    }
  };

  const on = (eventName: string): EventHandle => {
    const binding = onBindings?.[eventName];
    if (!binding) {
      return { emit: () => {}, shouldPreventDefault: false, bound: false };
    }
    const actionBindings: ActionBinding[] = Array.isArray(binding)
      ? binding
      : [binding];
    const shouldPreventDefault = actionBindings.some((b) => b.preventDefault);
    return { emit: () => emit(eventName), shouldPreventDefault, bound: true };
  };

  return { emit, on };
}

function dispatchBinding(
  binding: ActionBinding,
  ctx: PropResolutionContext,
  dispatcher: ActionDispatcherService,
): void {
  if (!binding.params) {
    dispatcher.execute(binding).catch(onEventDispatchError);
    return;
  }
  const resolved: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(binding.params)) {
    resolved[key] = resolveActionParam(val, ctx);
  }
  dispatcher
    .execute({ ...binding, params: resolved })
    .catch(onEventDispatchError);
}

function onEventDispatchError(error: unknown): void {
  console.debug("[json-render] Event action rejected:", error);
}

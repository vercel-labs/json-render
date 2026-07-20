import { InjectionToken, type Type } from "@angular/core";
import type {
  ActionHandler,
  ComputedFunction,
  DirectiveRegistry,
  ValidationFunction,
} from "@json-render/core";

import type { ActionHandlersFactory } from "../types/catalog-types";
import type { ComponentRegistry } from "../types/component-render.types";

/** Component registry (catalog name -> Angular component class). */
export const JSON_RENDER_REGISTRY = new InjectionToken<ComponentRegistry>(
  "JSON_RENDER_REGISTRY",
);

/** Statically-provided action handlers keyed by action name. */
export const JSON_RENDER_ACTION_HANDLERS = new InjectionToken<
  Record<string, ActionHandler>
>("JSON_RENDER_ACTION_HANDLERS");

/**
 * Named functions available for `$computed` expressions. Threaded from
 * `provideJsonRender` into every `PropResolutionContext` so core's
 * `{ "$computed": "fn", args }` resolution fires.
 */
export const JSON_RENDER_FUNCTIONS = new InjectionToken<
  Record<string, ComputedFunction>
>("JSON_RENDER_FUNCTIONS");

/**
 * Custom directive registry for user-defined `$`-prefixed dynamic values
 * (`$format`, `$math`, `$concat`, ...). Threaded from `provideJsonRender` into
 * every `PropResolutionContext` so core's directive resolution fires.
 */
export const JSON_RENDER_DIRECTIVES = new InjectionToken<DirectiveRegistry>(
  "JSON_RENDER_DIRECTIVES",
);

/**
 * Custom validation functions available to field `checks` whose `type` is not a
 * built-in. Threaded into the validation store so core's `runValidation`
 * resolves `{ "type": "<custom>", ... }` checks against user validators.
 */
export const JSON_RENDER_VALIDATION_FUNCTIONS = new InjectionToken<
  Record<string, ValidationFunction>
>("JSON_RENDER_VALIDATION_FUNCTIONS");

/**
 * Factory that builds runtime action handlers bound to the live state store.
 * Produced by `defineRegistry(...).handlers`; wired by `provideJsonRender` and
 * invoked by the action dispatcher with its own state accessors.
 */
export const JSON_RENDER_ACTION_HANDLERS_FACTORY =
  new InjectionToken<ActionHandlersFactory>(
    "JSON_RENDER_ACTION_HANDLERS_FACTORY",
  );

/** Navigation callback for the built-in `push`/`pop` actions. */
export const JSON_RENDER_NAVIGATE = new InjectionToken<(path: string) => void>(
  "JSON_RENDER_NAVIGATE",
);

/** Fallback component mounted for unknown element types / render errors. */
export const JSON_RENDER_FALLBACK = new InjectionToken<Type<unknown>>(
  "JSON_RENDER_FALLBACK",
);

import { makeEnvironmentProviders } from "@angular/core";
import type { EnvironmentProviders, Provider, Type } from "@angular/core";
import type {
  ActionHandler,
  Catalog,
  ComputedFunction,
  DirectiveRegistry,
  ValidationFunction,
} from "@json-render/core";

import {
  JSON_RENDER_ACTION_HANDLERS,
  JSON_RENDER_ACTION_HANDLERS_FACTORY,
  JSON_RENDER_DIRECTIVES,
  JSON_RENDER_FALLBACK,
  JSON_RENDER_FUNCTIONS,
  JSON_RENDER_NAVIGATE,
  JSON_RENDER_REGISTRY,
  JSON_RENDER_VALIDATION_FUNCTIONS,
} from "./registry.token";
import type {
  Actions,
  ActionHandlersFactory,
  CatalogHasActions,
  SetState,
  StateModel,
} from "../types/catalog-types";
import type { ComponentRegistry } from "../types/component-render.types";

/** Result of {@link defineRegistry}. */
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

type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

/** Options for {@link defineRegistry}. Actions are required when the catalog declares them. */
type DefineRegistryOptions<C extends Catalog> = {
  components?: Record<string, Type<unknown>>;
} & (CatalogHasActions<C> extends true
  ? { actions: Actions<C> }
  : { actions?: Actions<C> });

/**
 * Create a type-safe registry from a catalog, mapping component names to Angular
 * component classes and exposing action handlers/executors bound to state.
 */
export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: DefineRegistryOptions<C>,
): DefineRegistryResult {
  const registry: ComponentRegistry = {};
  if (options.components) {
    for (const [name, componentType] of Object.entries(options.components)) {
      registry[name] = componentType;
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
    if (entry) {
      await entry[1](params, setState, state);
    } else {
      console.warn(`Unknown action: ${actionName}`);
    }
  };

  return { registry, handlers, executeAction };
}

/** Options for {@link provideJsonRender}. */
export interface ProvideJsonRenderOptions {
  registry: ComponentRegistry;
  handlers?: Record<string, ActionHandler>;
  /**
   * Factory (`defineRegistry(...).handlers`) that builds runtime handlers bound
   * to the live state store. Prefer this over `handlers` for registered actions
   * that mutate state: the dispatcher invokes it with its own state accessors so
   * each handler receives `(params, setState, state)`.
   */
  handlersFactory?: ActionHandlersFactory;
  navigate?: (path: string) => void;
  fallback?: Type<unknown>;
  /** Named functions available for `$computed` expressions. */
  functions?: Record<string, ComputedFunction>;
  /** Custom directive registry for user-defined `$`-prefixed dynamic values. */
  directives?: DirectiveRegistry;
  /** Custom validation functions for field `checks` with a non-built-in `type`. */
  validationFunctions?: Record<string, ValidationFunction>;
}

/**
 * Provide the renderer's configuration at the environment (or component) level.
 * The Angular equivalent of the baseline renderers' `JSONUIProvider`.
 */
export function provideJsonRender(
  options: ProvideJsonRenderOptions,
): EnvironmentProviders {
  const providers: Provider[] = [
    { provide: JSON_RENDER_REGISTRY, useValue: options.registry },
  ];

  if (options.handlers) {
    providers.push({
      provide: JSON_RENDER_ACTION_HANDLERS,
      useValue: options.handlers,
    });
  }
  if (options.handlersFactory) {
    providers.push({
      provide: JSON_RENDER_ACTION_HANDLERS_FACTORY,
      useValue: options.handlersFactory,
    });
  }
  if (options.navigate) {
    providers.push({
      provide: JSON_RENDER_NAVIGATE,
      useValue: options.navigate,
    });
  }
  if (options.fallback) {
    providers.push({
      provide: JSON_RENDER_FALLBACK,
      useValue: options.fallback,
    });
  }
  if (options.functions) {
    providers.push({
      provide: JSON_RENDER_FUNCTIONS,
      useValue: options.functions,
    });
  }
  if (options.directives) {
    providers.push({
      provide: JSON_RENDER_DIRECTIVES,
      useValue: options.directives,
    });
  }
  if (options.validationFunctions) {
    providers.push({
      provide: JSON_RENDER_VALIDATION_FUNCTIONS,
      useValue: options.validationFunctions,
    });
  }

  return makeEnvironmentProviders(providers);
}

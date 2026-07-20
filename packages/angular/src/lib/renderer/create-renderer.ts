import type { EnvironmentProviders, Type } from "@angular/core";
import type {
  Catalog,
  ComputedFunction,
  DirectiveRegistry,
  ValidationFunction,
} from "@json-render/core";

import { JsonRendererComponent } from "./json-renderer.component";
import { defineRegistry, provideJsonRender } from "../registry/registry";
import type { Actions, CatalogHasActions } from "../types/catalog-types";

/** Map of catalog component name to Angular component class. */
export type ComponentMap = Record<string, Type<unknown>>;

/** Options for {@link createRenderer}. */
export type CreateRendererProps<C extends Catalog> = {
  /** Component name -> Angular component class. */
  components: ComponentMap;
  navigate?: (path: string) => void;
  fallback?: Type<unknown>;
  functions?: Record<string, ComputedFunction>;
  directives?: DirectiveRegistry;
  validationFunctions?: Record<string, ValidationFunction>;
} & (CatalogHasActions<C> extends true
  ? { actions: Actions<C> }
  : { actions?: Actions<C> });

/** Result of {@link createRenderer}. */
export interface CreateRendererResult {
  /** Environment providers to register (route/bootstrap/component providers). */
  providers: EnvironmentProviders;
  /** The renderer component to place in a template. */
  JsonRenderer: typeof JsonRendererComponent;
}

/**
 * One-call setup for a catalog. The Angular equivalent of the baseline
 * renderers' `createRenderer`. Wires `defineRegistry` + `provideJsonRender` and
 * hands back the providers plus the `<json-render>` component.
 *
 * ```ts
 * const { providers, JsonRenderer } = createRenderer(catalog, {
 *   components: { Card: CardComponent, Text: TextComponent },
 * });
 *
 * // Route/bootstrap:
 * providers: [providers]
 *
 * // Template (import JsonRenderer):
 * <json-render [spec]="spec()" />
 * ```
 */
export function createRenderer<C extends Catalog>(
  catalog: C,
  props: CreateRendererProps<C>,
): CreateRendererResult {
  const { registry, handlers } = defineRegistry(catalog, {
    components: props.components,
    // `actions` is conditionally required by the catalog; forward as-is.
    actions: (props as { actions?: Actions<C> }).actions as never,
  });

  const providers = provideJsonRender({
    registry,
    handlersFactory: handlers,
    navigate: props.navigate,
    fallback: props.fallback,
    functions: props.functions,
    directives: props.directives,
    validationFunctions: props.validationFunctions,
  });

  return { providers, JsonRenderer: JsonRendererComponent };
}

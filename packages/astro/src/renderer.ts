import type { Catalog } from "@json-render/core";
import type { AstroComponentRegistry, Components } from "./catalog-types";

export interface DefineRegistryResult {
  registry: AstroComponentRegistry;
}

/**
 * Create a typed registry from a catalog with Astro components.
 *
 * @example
 * ```ts
 * import { defineRegistry } from '@json-render/astro';
 * import Hero from './components/Hero.astro';
 * import Card from './components/Card.astro';
 *
 * const { registry } = defineRegistry(catalog, {
 *   components: { Hero, Card },
 * });
 * ```
 */
export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: {
    components: Components<C>;
  },
): DefineRegistryResult {
  return { registry: options.components as AstroComponentRegistry };
}

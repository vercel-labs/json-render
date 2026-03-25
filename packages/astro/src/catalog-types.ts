import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type {
  Catalog,
  InferCatalogComponents,
  StateModel,
} from "@json-render/core";

export type { StateModel };

/**
 * Registry mapping component type names to Astro components.
 *
 * Uses `AstroComponentFactory` — the compiled type that all `.astro` files
 * produce. Catalog Zod schemas provide the runtime props validation layer.
 *
 * @example
 * ```ts
 * const registry: AstroComponentRegistry = {
 *   Card: CardComponent,
 *   Hero: HeroComponent,
 * };
 * ```
 */
export type AstroComponentRegistry = Record<string, AstroComponentFactory>;

/**
 * Typed registry of all Astro components for a catalog.
 * Keys are enforced by the catalog, values are Astro component factories.
 *
 * @example
 * ```ts
 * const { registry } = defineRegistry(catalog, {
 *   components: { Card, Hero, Badge },
 * });
 * ```
 */
export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: AstroComponentFactory;
};

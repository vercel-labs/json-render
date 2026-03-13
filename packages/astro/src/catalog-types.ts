import type {
  Catalog,
  InferCatalogComponents,
  InferComponentProps,
} from "@json-render/core";

/**
 * Props passed to SSR component render functions.
 *
 * Unlike React/Vue renderers, Astro SSR components receive pre-rendered
 * children as an HTML string and return an HTML string.
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** Resolved props (all $state/$cond expressions already evaluated) */
  props: P;
  /** Pre-rendered children as HTML string (already resolved and concatenated) */
  children: string;
}

/**
 * An SSR component render function.
 * Takes resolved props + pre-rendered children HTML, returns an HTML string.
 *
 * @example
 * ```ts
 * const Card: ComponentRenderer<{ title: string }> = ({ props, children }) =>
 *   `<div class="card"><h3>${escapeHtml(props.title)}</h3>${children}</div>`;
 * ```
 */
export type ComponentRenderer<P = Record<string, unknown>> = (
  ctx: ComponentRenderProps<P>,
) => string;

/**
 * Registry mapping component type names to SSR render functions.
 */
export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

/**
 * Typed component render function for a specific catalog component.
 */
export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = ComponentRenderer<InferComponentProps<C, K>>;

/**
 * Typed registry of all component render functions for a catalog.
 */
export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: ComponentFn<C, K>;
};

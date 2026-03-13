import type { Spec } from "@json-render/core";
import {
  resolveElementProps,
  evaluateVisibility,
  getByPath,
  type PropResolutionContext,
} from "@json-render/core";
import type { ComponentRegistry } from "./catalog-types";

export type { ComponentRegistry };

/**
 * Options for renderToHtml
 */
export interface RenderOptions {
  /** Component registry mapping type names to render functions */
  registry: ComponentRegistry;
  /** State model for resolving $state expressions and visibility conditions */
  state?: Record<string, unknown>;
}

/**
 * Render a single element to HTML string (recursive).
 *
 * Follows the same traversal pattern as @json-render/react-email's renderElement(),
 * but outputs raw HTML strings instead of React elements.
 */
function renderElement(
  elementKey: string,
  spec: Spec,
  registry: ComponentRegistry,
  stateModel: Record<string, unknown>,
  repeatItem?: unknown,
  repeatIndex?: number,
  repeatBasePath?: string,
): string {
  const element = spec.elements[elementKey];
  if (!element) return "";

  const ctx: PropResolutionContext = {
    stateModel,
    repeatItem,
    repeatIndex,
    repeatBasePath,
  };

  // Evaluate visibility
  if (element.visible !== undefined) {
    if (!evaluateVisibility(element.visible, ctx)) {
      return "";
    }
  }

  // Get the component renderer
  const Component = registry[element.type];
  if (!Component) {
    console.warn(
      `[json-render/astro] No renderer for component type: ${element.type}`,
    );
    return "";
  }

  // Handle repeat: render children once per item in state array
  if (element.repeat) {
    const items =
      (getByPath(stateModel, element.repeat.statePath) as
        | unknown[]
        | undefined) ?? [];

    const repeat = element.repeat;

    return items
      .map((item, index) => {
        const childPath = `${repeat.statePath}/${index}`;
        const iterCtx: PropResolutionContext = {
          stateModel,
          repeatItem: item,
          repeatIndex: index,
          repeatBasePath: childPath,
        };

        // Resolve props per iteration so $item/$index are available
        const iterProps = resolveElementProps(
          element.props as Record<string, unknown>,
          iterCtx,
        );

        const childrenHtml = (element.children ?? [])
          .map((childKey) =>
            renderElement(
              childKey,
              spec,
              registry,
              stateModel,
              item,
              index,
              childPath,
            ),
          )
          .join("");

        return Component({ props: iterProps, children: childrenHtml });
      })
      .join("");
  }

  // Resolve dynamic prop expressions ($state, $cond, $item, $index, $template)
  const resolvedProps = resolveElementProps(
    element.props as Record<string, unknown>,
    ctx,
  );

  // Render children recursively
  const childrenHtml = (element.children ?? [])
    .map((childKey) =>
      renderElement(
        childKey,
        spec,
        registry,
        stateModel,
        repeatItem,
        repeatIndex,
        repeatBasePath,
      ),
    )
    .join("");

  return Component({ props: resolvedProps, children: childrenHtml });
}

/**
 * Render a json-render spec to an HTML string.
 *
 * Pure, synchronous, server-side function with no framework dependencies.
 * Safe to use in Astro SSR, Cloudflare Workers, Node.js, Deno, Bun, or any server environment.
 *
 * @example
 * ```ts
 * import { renderToHtml } from "@json-render/astro/render";
 *
 * const html = renderToHtml(spec, {
 *   registry: {
 *     Hero: ({ props, children }) =>
 *       `<section class="hero"><h1>${escapeHtml(props.title)}</h1>${children}</section>`,
 *     Text: ({ props }) =>
 *       `<p>${escapeHtml(props.content)}</p>`,
 *   },
 *   state: { showBanner: true },
 * });
 * ```
 */
export function renderToHtml(spec: Spec, options: RenderOptions): string {
  if (!spec?.root) return "";

  const rootElement = spec.elements[spec.root];
  if (!rootElement) {
    console.warn(
      `[json-render/astro] Root element "${spec.root}" not found in spec.elements`,
    );
    return "";
  }

  const mergedState: Record<string, unknown> = {
    ...spec.state,
    ...options.state,
  };

  return renderElement(spec.root, spec, options.registry, mergedState);
}

/**
 * Escape HTML special characters to prevent XSS.
 * Use this in component render functions for any user-provided content.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

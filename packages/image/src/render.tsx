import React from "react";
import satori, { type SatoriOptions } from "satori";
import type { Spec, UIElement } from "@json-render/core";
import {
  resolveElementProps,
  evaluateVisibility,
  getByPath,
  type PropResolutionContext,
} from "@json-render/core";
import { standardComponents } from "./components/standard";
import type { ComponentRegistry } from "./types";

export { standardComponents };

export interface RenderOptions {
  registry?: ComponentRegistry;
  includeStandard?: boolean;
  state?: Record<string, unknown>;
  fonts?: SatoriOptions["fonts"];
  /** Override the Frame width. When omitted, uses the Frame component's width prop. */
  width?: number;
  /** Override the Frame height. When omitted, uses the Frame component's height prop. */
  height?: number;
}

const noopEmit = () => {};

function renderElement(
  elementKey: string,
  spec: Spec,
  registry: ComponentRegistry,
  stateModel: Record<string, unknown>,
  repeatItem?: unknown,
  repeatIndex?: number,
  repeatBasePath?: string,
): React.ReactElement | null {
  const element = spec.elements[elementKey];
  if (!element) return null;

  const ctx: PropResolutionContext = {
    stateModel,
    repeatItem,
    repeatIndex,
    repeatBasePath,
  };

  if (element.visible !== undefined) {
    if (!evaluateVisibility(element.visible, ctx)) {
      return null;
    }
  }

  const resolvedProps = resolveElementProps(
    element.props as Record<string, unknown>,
    ctx,
  );
  const resolvedElement: UIElement = { ...element, props: resolvedProps };

  const Component = registry[resolvedElement.type];
  if (!Component) return null;

  if (resolvedElement.repeat) {
    const items =
      (getByPath(stateModel, resolvedElement.repeat.statePath) as
        | unknown[]
        | undefined) ?? [];

    const fragments = items.map((item, index) => {
      const key =
        resolvedElement.repeat!.key && typeof item === "object" && item !== null
          ? String(
              (item as Record<string, unknown>)[resolvedElement.repeat!.key!] ??
                index,
            )
          : String(index);

      const childPath = `${resolvedElement.repeat!.statePath}/${index}`;
      const children = resolvedElement.children?.map((childKey) =>
        renderElement(
          childKey,
          spec,
          registry,
          stateModel,
          item,
          index,
          childPath,
        ),
      );

      return (
        <Component key={key} element={resolvedElement} emit={noopEmit}>
          {children}
        </Component>
      );
    });

    return <>{fragments}</>;
  }

  const children = resolvedElement.children?.map((childKey) =>
    renderElement(
      childKey,
      spec,
      registry,
      stateModel,
      repeatItem,
      repeatIndex,
      repeatBasePath,
    ),
  );

  return (
    <Component key={elementKey} element={resolvedElement} emit={noopEmit}>
      {children && children.length > 0 ? children : undefined}
    </Component>
  );
}

interface ImageDimensions {
  width: number;
  height: number;
}

function getDimensions(
  spec: Spec,
  options: RenderOptions = {},
): ImageDimensions {
  if (options.width && options.height) {
    return { width: options.width, height: options.height };
  }

  const rootElement = spec.elements[spec.root];
  const props = rootElement?.props as Record<string, unknown> | undefined;

  return {
    width: options.width ?? (props?.width as number) ?? 1200,
    height: options.height ?? (props?.height as number) ?? 630,
  };
}

function buildTree(
  spec: Spec,
  options: RenderOptions = {},
): React.ReactElement {
  const {
    registry: customRegistry,
    includeStandard = true,
    state = {},
  } = options;

  const mergedState: Record<string, unknown> = {
    ...spec.state,
    ...state,
  };

  const registry: ComponentRegistry = {
    ...(includeStandard ? standardComponents : {}),
    ...customRegistry,
  };

  const root = renderElement(spec.root, spec, registry, mergedState);
  return root ?? <></>;
}

/**
 * Render a json-render spec to an SVG string.
 *
 * Uses Satori to convert the spec's component tree into SVG.
 * No additional dependencies are needed beyond satori.
 */
export async function renderToSvg(
  spec: Spec,
  options: RenderOptions = {},
): Promise<string> {
  const tree = buildTree(spec, options);
  const { width, height } = getDimensions(spec, options);

  return satori(tree as React.ReactNode, {
    width,
    height,
    fonts: options.fonts ?? [],
  });
}

/**
 * Render a json-render spec to a PNG buffer.
 *
 * Requires `@resvg/resvg-js` to be installed as a peer dependency.
 * The SVG is first generated via Satori, then rasterized to PNG.
 */
export async function renderToPng(
  spec: Spec,
  options: RenderOptions = {},
): Promise<Uint8Array> {
  const svg = await renderToSvg(spec, options);

  let Resvg: typeof import("@resvg/resvg-js").Resvg;
  try {
    const mod = await import("@resvg/resvg-js");
    Resvg = mod.Resvg;
  } catch {
    throw new Error(
      "@resvg/resvg-js is required for PNG output. Install it with: npm install @resvg/resvg-js",
    );
  }

  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

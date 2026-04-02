import React from "react";
import {
  renderToBuffer as pdfRenderToBuffer,
  renderToStream as pdfRenderToStream,
  render as pdfRender,
} from "@react-pdf/renderer";
import type { Spec, UIElement } from "@json-render/core";
import {
  resolveElementProps,
  evaluateVisibility,
  getByPath,
  type PropResolutionContext,
} from "@json-render/core";
import { standardComponents } from "./components/standard";

// Re-export the standard components for use in custom registries
export { standardComponents };

export type RenderComponentRegistry = Record<string, React.ComponentType<any>>;

export interface RenderOptions {
  registry?: RenderComponentRegistry;
  includeStandard?: boolean;
  state?: Record<string, unknown>;
}

const noopEmit = () => {};

function renderElement(
  elementKey: string,
  spec: Spec,
  registry: RenderComponentRegistry,
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
    const repeat = resolvedElement.repeat;
    let statePath: string;
    if (typeof repeat.statePath === "string") {
      statePath = repeat.statePath;
    } else if (
      typeof repeat.statePath === "object" &&
      repeat.statePath !== null &&
      "$item" in repeat.statePath
    ) {
      const field = (repeat.statePath as Record<string, string>).$item;
      if (repeatBasePath) {
        statePath =
          field === "" ? repeatBasePath : `${repeatBasePath}/${field}`;
      } else {
        console.warn(
          "[json-render/react-pdf] $item in repeat.statePath used outside of a repeat scope",
        );
        statePath = field === "" ? "/" : `/${field}`;
      }
    } else {
      statePath = String(repeat.statePath);
    }

    const items =
      (getByPath(stateModel, statePath) as unknown[] | undefined) ?? [];

    const fragments = items.map((item, index) => {
      const key =
        repeat.key && typeof item === "object" && item !== null
          ? String((item as Record<string, unknown>)[repeat.key!] ?? index)
          : String(index);

      const childPath = `${statePath}/${index}`;
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

function buildDocument(
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

  const registry: RenderComponentRegistry = {
    ...(includeStandard ? standardComponents : {}),
    ...customRegistry,
  };

  const root = renderElement(spec.root, spec, registry, mergedState);
  return root ?? <></>;
}

/**
 * Render a json-render spec to a PDF buffer.
 *
 * This is a standalone server-side function that resolves the spec tree
 * without React hooks or contexts, making it safe to import in Next.js
 * route handlers and other server-only environments.
 */
export async function renderToBuffer(
  spec: Spec,
  options?: RenderOptions,
): Promise<Uint8Array> {
  const document = buildDocument(spec, options);
  return pdfRenderToBuffer(document as any);
}

/**
 * Render a json-render spec to a PDF readable stream.
 */
export async function renderToStream(
  spec: Spec,
  options?: RenderOptions,
): Promise<ReadableStream> {
  const document = buildDocument(spec, options);
  return pdfRenderToStream(document as any);
}

/**
 * Render a json-render spec to a PDF file on disk.
 */
export async function renderToFile(
  spec: Spec,
  filePath: string,
  options?: RenderOptions,
): Promise<void> {
  const document = buildDocument(spec, options);
  await pdfRender(document as any, filePath);
}

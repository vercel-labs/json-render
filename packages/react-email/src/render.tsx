import React from "react";
import { render } from "@react-email/render";
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
    const items =
      (getByPath(stateModel, resolvedElement.repeat.statePath) as
        | unknown[]
        | undefined) ?? [];

    const repeat = resolvedElement.repeat!;
    const fragments = items.map((item, index) => {
      const repeatKey = repeat.key;
      const key =
        repeatKey && typeof item === "object" && item !== null
          ? String((item as Record<string, unknown>)[repeatKey] ?? index)
          : String(index);

      const childPath = `${repeat.statePath}/${index}`;
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
  if (!root) {
    console.warn(
      `[json-render/react-email] Root element "${spec.root}" not found in spec.elements`,
    );
  }
  return root ?? <></>;
}

/**
 * Render a json-render spec to an HTML email string.
 *
 * This is a standalone server-side function that resolves the spec tree
 * without React hooks or contexts, making it safe to import in Next.js
 * route handlers and other server-only environments.
 */
export async function renderToHtml(
  spec: Spec,
  options?: RenderOptions,
): Promise<string> {
  const document = buildDocument(spec, options);
  return render(document);
}

/**
 * Render a json-render spec to a plain text email string.
 */
export async function renderToPlainText(
  spec: Spec,
  options?: RenderOptions,
): Promise<string> {
  const document = buildDocument(spec, options);
  return render(document, { plainText: true });
}

import React from "react";
import { render } from "@react-email/render";
import type { Spec, UIElement } from "@json-render/core";
import {
  resolveElementProps,
  resolveRepeatItemStatePath,
  resolveRepeatStatePath,
  evaluateVisibility,
  getByPath,
  type PropResolutionContext,
} from "@json-render/core";
import { standardComponents } from "./components/standard";
import { standardComponentDefinitions } from "./catalog";

const standardDefs: Record<string, { slots: readonly string[] }> =
  standardComponentDefinitions;

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
  if (!Component) {
    console.warn(
      `[json-render/react-email] Unknown component type "${resolvedElement.type}" for element "${elementKey}", skipping it`,
    );
    return null;
  }

  // Standard leaf components render only their props, so children vanish.
  // Custom overrides may render children, so only warn for the standard one.
  if (
    resolvedElement.children?.length &&
    Component === standardComponents[resolvedElement.type] &&
    standardDefs[resolvedElement.type]?.slots.length === 0
  ) {
    console.warn(
      `[json-render/react-email] "${resolvedElement.type}" does not render children; ${resolvedElement.children.length} child element(s) of "${elementKey}" will be dropped`,
    );
  }

  if (resolvedElement.repeat) {
    const repeat = resolvedElement.repeat;
    const statePath = resolveRepeatStatePath(repeat.statePath, repeatBasePath);
    if (statePath === undefined) {
      console.warn(
        "[json-render/react-email] $item in repeat.statePath used outside of a repeat scope",
      );
      return null;
    }

    const items =
      (getByPath(stateModel, statePath) as unknown[] | undefined) ?? [];

    const fragments = items.map((item, index) => {
      const repeatKey = repeat.key;
      const key =
        repeatKey && typeof item === "object" && item !== null
          ? String((item as Record<string, unknown>)[repeatKey] ?? index)
          : String(index);

      const childPath = resolveRepeatItemStatePath(statePath, index);
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

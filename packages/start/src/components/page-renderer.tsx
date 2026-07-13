import React, { useMemo, type ReactNode } from "react";
import type { Spec } from "@json-render/core";
import {
  Renderer,
  JSONUIProvider,
  type ComponentRegistry,
  type ComponentRenderProps,
} from "@json-render/react";
import { useStartApp } from "./provider";

/**
 * Props for PageRenderer.
 */
export interface PageRendererProps {
  /** Page element tree spec */
  spec: Spec;
  /** Initial state (merged from spec.state, global state, and loader data) */
  initialState?: Record<string, unknown>;
  /** Optional layout element tree spec */
  layoutSpec?: Spec | null;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
}

/**
 * Built-in Slot component that renders children passed into layouts.
 */
function SlotComponent({ children }: ComponentRenderProps) {
  return <>{children}</>;
}

/**
 * Client component that renders a json-render page within the
 * TanStack Start app.
 *
 * Reads the component registry and action handlers from StartAppProvider
 * context. Handles layout rendering by injecting page content into a
 * Slot component.
 */
export function PageRenderer({
  spec,
  initialState,
  layoutSpec,
  loading,
}: PageRendererProps) {
  const { registry, handlers, navigate } = useStartApp();

  const augmentedRegistry: ComponentRegistry = useMemo(() => {
    return {
      ...registry,
      Slot: SlotComponent,
    };
  }, [registry]);

  const actionHandlers = useMemo(() => {
    const base: Record<
      string,
      (params: Record<string, unknown>) => Promise<unknown> | unknown
    > = { ...handlers };

    base.navigate = (params: Record<string, unknown>) => {
      const href = params.href as string | undefined;
      if (href) navigate(href);
    };

    return base;
  }, [handlers, navigate]);

  const pageContent = (
    <Renderer spec={spec} registry={augmentedRegistry} loading={loading} />
  );

  return (
    <JSONUIProvider
      registry={augmentedRegistry}
      initialState={initialState}
      handlers={actionHandlers}
      navigate={navigate}
    >
      {layoutSpec ? (
        <LayoutWithSlot
          layoutSpec={layoutSpec}
          registry={augmentedRegistry}
          loading={loading}
        >
          {pageContent}
        </LayoutWithSlot>
      ) : (
        pageContent
      )}
    </JSONUIProvider>
  );
}

/**
 * Renders a layout spec and injects children into the Slot.
 */
function LayoutWithSlot({
  layoutSpec,
  registry,
  loading,
  children,
}: {
  layoutSpec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  children: ReactNode;
}) {
  const layoutRegistry: ComponentRegistry = useMemo(() => {
    return {
      ...registry,
      Slot: function LayoutSlot() {
        return <>{children}</>;
      },
    };
  }, [registry, children]);

  return (
    <Renderer spec={layoutSpec} registry={layoutRegistry} loading={loading} />
  );
}

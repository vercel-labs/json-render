import React, { useMemo, type ReactNode } from "react";
import type { Spec } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRegistry,
  type ComponentRenderProps,
} from "@json-render/react";
import { Link } from "./link";
import { useStartApp } from "./provider";

export interface PageRendererProps {
  spec: Spec;
  initialState?: Record<string, unknown>;
  layoutSpec?: Spec | null;
  loading?: boolean;
}

function Slot({ children }: ComponentRenderProps) {
  return <>{children}</>;
}

/** Render page data returned by `createStartApp` inside an optional layout. */
export function PageRenderer({
  spec,
  initialState,
  layoutSpec,
  loading,
}: PageRendererProps) {
  const { registry, handlers, navigate } = useStartApp();
  const augmentedRegistry: ComponentRegistry = useMemo(
    () => ({ ...registry, Link, Slot }),
    [registry],
  );
  const actionHandlers = useMemo(
    () => ({
      ...handlers,
      navigate: (params: Record<string, unknown>) => {
        const href = params.href;
        if (typeof href === "string") navigate(href);
      },
    }),
    [handlers, navigate],
  );

  const page = (
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
          {page}
        </LayoutWithSlot>
      ) : (
        page
      )}
    </JSONUIProvider>
  );
}

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
  const layoutRegistry: ComponentRegistry = useMemo(
    () => ({
      ...registry,
      Slot: function LayoutSlot() {
        return <>{children}</>;
      },
    }),
    [children, registry],
  );

  return (
    <Renderer spec={layoutSpec} registry={layoutRegistry} loading={loading} />
  );
}

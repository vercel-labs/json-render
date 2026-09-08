import React, { useMemo, type ReactNode } from "react";
import { useMatch } from "@tanstack/react-router";
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
  const {
    registry,
    handlers,
    spec: appSpec,
    functions,
    navigate,
  } = useStartApp();
  const renderedPathname = useMatch({
    strict: false,
    select: (match) => match.pathname,
  });
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
  const resolvedInitialState = useMemo(() => {
    if (initialState !== undefined) return initialState;
    if (!appSpec?.state && !layoutSpec?.state && !spec.state) return undefined;
    return { ...appSpec?.state, ...layoutSpec?.state, ...spec.state };
  }, [appSpec?.state, initialState, layoutSpec?.state, spec.state]);

  const page = (
    <Renderer spec={spec} registry={augmentedRegistry} loading={loading} />
  );

  // Key from the rendered match rather than the global location. During a
  // pending navigation, TanStack advances the location while keeping the
  // previous match mounted until the next page is ready.
  return (
    <JSONUIProvider
      key={renderedPathname}
      registry={augmentedRegistry}
      initialState={resolvedInitialState}
      handlers={actionHandlers}
      navigate={navigate}
      functions={functions}
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

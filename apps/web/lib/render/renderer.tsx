"use client";

import type { ReactNode } from "react";
import { JSONUIProvider, Renderer, type Spec } from "@json-render/react-email";
import { registry, Fallback } from "./registry";

interface PlaygroundRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

const fallbackRenderer = (renderProps: { element: { type: string } }) => (
  <Fallback type={renderProps.element.type} />
);

export function PlaygroundRenderer({
  spec,
  loading,
}: PlaygroundRendererProps): ReactNode {
  if (!spec) return null;

  return (
    <JSONUIProvider initialState={spec.state ?? {}}>
      <Renderer
        spec={spec}
        registry={registry}
        fallback={fallbackRenderer}
        loading={loading}
      />
    </JSONUIProvider>
  );
}

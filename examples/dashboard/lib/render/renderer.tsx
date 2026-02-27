"use client";

import { useMemo, useRef, type ReactNode } from "react";
import {
  Renderer,
  type ComponentRenderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";

import { registry, Fallback, handlers as createHandlers } from "./registry";

// =============================================================================
// DashboardRenderer
// =============================================================================

type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

interface DashboardRendererProps {
  spec: Spec | null;
  state?: Record<string, unknown>;
  setState?: SetState;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  loading?: boolean;
}

// Fallback component for unknown types
const fallback: ComponentRenderer = ({ element }) => (
  <Fallback type={element.type} />
);

export function DashboardRenderer({
  spec,
  state = {},
  setState,
  onStateChange,
  loading,
}: DashboardRendererProps): ReactNode {
  // Use refs so action handlers always see the latest state/setState
  const stateRef = useRef(state);
  const setStateRef = useRef(setState);
  stateRef.current = state;
  setStateRef.current = setState;

  // Create ActionProvider-compatible handlers using getters so they
  // always read the latest state/setState from refs
  const actionHandlers = useMemo(
    () =>
      createHandlers(
        () => setStateRef.current,
        () => stateRef.current,
      ),
    [],
  );

  if (!spec) return null;

  return (
    <StateProvider initialState={state} onStateChange={onStateChange}>
      <VisibilityProvider>
        <ActionProvider handlers={actionHandlers}>
          <Renderer
            spec={spec}
            registry={registry}
            fallback={fallback}
            loading={loading}
          />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

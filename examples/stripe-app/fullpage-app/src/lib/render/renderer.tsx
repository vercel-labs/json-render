import { useMemo, useRef, type ReactNode } from "react";
import {
  Renderer,
  type ComponentRegistry,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";

import { components, Fallback } from "./catalog/components";
import { executeAction } from "./catalog/actions";

// =============================================================================
// Types
// =============================================================================

type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

export interface StripeRendererProps {
  /** The UI spec to render (from json-render) */
  spec: Spec | null;
  /** Data context for components */
  data?: Record<string, unknown>;
  /** Function to update data */
  setData?: SetState;
  /** Callback when data changes */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
}

// =============================================================================
// Build Registry
// =============================================================================

/**
 * Build a component registry from our components map.
 * Uses refs to avoid recreating on data changes.
 */
function buildRegistry(
  dataRef: React.RefObject<Record<string, unknown>>,
  setDataRef: React.RefObject<SetState | undefined>,
  loading?: boolean,
): ComponentRegistry {
  const registry: ComponentRegistry = {};

  for (const [name, Component] of Object.entries(components)) {
    const noop = () => {};
    registry[name] = (renderProps: {
      element: { type: string; props: Record<string, unknown> };
      children?: ReactNode;
      emit?: (event: string) => void;
    }) =>
      Component({
        element: renderProps.element,
        children: renderProps.children,
        emit: renderProps.emit ?? noop,
        loading,
        state: dataRef.current,
        getValue: (path: string) => {
          const data = dataRef.current;
          const parts = path.replace(/^\//, "").split("/");
          let current: unknown = data;
          for (const part of parts) {
            if (current && typeof current === "object" && part in current) {
              current = (current as Record<string, unknown>)[part];
            } else {
              return undefined;
            }
          }
          return current;
        },
        onAction: (actionName: string, params?: Record<string, unknown>) => {
          const setState = setDataRef.current;
          if (setState) {
            executeAction(actionName, params, setState, dataRef.current);
          }
        },
      });
  }

  return registry;
}

/**
 * Fallback component for unknown types
 */
const fallbackRegistry = (renderProps: {
  element: { type: string; props: Record<string, unknown> };
}) => <Fallback element={renderProps.element} />;

// =============================================================================
// StripeRenderer Component
// =============================================================================

/**
 * Main renderer component for Stripe UIXT.
 *
 * Wraps the json-render Renderer with all necessary providers
 * and connects it to the Stripe component implementations.
 */
export function StripeRenderer({
  spec,
  data = {},
  setData,
  onStateChange,
  loading,
}: StripeRendererProps): ReactNode {
  // Use refs to keep registry stable while still accessing latest data/setData
  const dataRef = useRef(data);
  const setDataRef = useRef(setData);
  dataRef.current = data;
  setDataRef.current = setData;

  // Memoize registry - only changes when loading changes
  const registry = useMemo(
    () => buildRegistry(dataRef, setDataRef, loading),
    [loading],
  );

  const mergedState = useMemo(
    () => (spec?.state ? { ...data, ...spec.state } : data),
    [data, spec?.state],
  );

  if (!spec) return null;

  return (
    <StateProvider initialState={mergedState} onStateChange={onStateChange}>
      <VisibilityProvider>
        <ActionProvider>
          <Renderer
            spec={spec}
            registry={registry}
            fallback={fallbackRegistry}
            loading={loading}
          />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

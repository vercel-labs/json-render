import { type ReactNode } from "react";
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
  ValidationProvider,
  type ComponentRegistry,
  type ComponentRenderer,
} from "@json-render/react";
import type { Spec, StateStore, ComputedFunction } from "@json-render/core";

// =============================================================================
// GsplatRenderer
// =============================================================================

export interface GsplatRendererProps {
  /** The spec to render */
  spec: Spec | null;
  /** Component registry */
  registry: ComponentRegistry;
  /**
   * External store (controlled mode). When provided, `initialState` and
   * `onStateChange` are ignored.
   */
  store?: StateStore;
  /** Initial state model (uncontrolled mode) */
  initialState?: Record<string, unknown>;
  /** Action handlers */
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  /** Named functions for `$computed` expressions in props */
  functions?: Record<string, ComputedFunction>;
  /** Callback when state changes (uncontrolled mode) */
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
  /** Additional elements */
  children?: ReactNode;
}

/**
 * Renders a json-render spec as gaussian splat scenes.
 *
 * @example
 * ```tsx
 * <GsplatRenderer spec={spec} registry={registry} />
 * ```
 */
export function GsplatRenderer({
  spec,
  registry,
  store,
  initialState,
  handlers,
  functions,
  onStateChange,
  loading,
  fallback,
  children,
}: GsplatRendererProps) {
  return (
    <StateProvider
      store={store}
      initialState={initialState ?? spec?.state}
      onStateChange={onStateChange}
    >
      <VisibilityProvider>
        <ValidationProvider>
          <ActionProvider handlers={handlers}>
            <Renderer
              spec={spec}
              registry={registry}
              loading={loading}
              fallback={fallback}
            />
            {children}
          </ActionProvider>
        </ValidationProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}

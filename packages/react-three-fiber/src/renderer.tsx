import { type ReactNode } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";
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
// ThreeRenderer
// =============================================================================

export interface ThreeRendererProps {
  /** The spec to render as a 3D scene */
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
  /** Additional R3F elements to render alongside the spec (lights, helpers, etc.) */
  children?: ReactNode;
}

/**
 * Renders a json-render spec as a React Three Fiber scene graph.
 *
 * Place inside a `<Canvas>` or use `<ThreeCanvas>` for a convenience wrapper.
 *
 * @example
 * ```tsx
 * <Canvas shadows>
 *   <ThreeRenderer spec={spec} registry={registry} />
 * </Canvas>
 * ```
 */
export function ThreeRenderer({
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
}: ThreeRendererProps) {
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

// =============================================================================
// ThreeCanvas
// =============================================================================

export interface ThreeCanvasProps extends ThreeRendererProps {
  /** Enable shadows on the Canvas */
  shadows?: CanvasProps["shadows"];
  /** Canvas camera config */
  camera?: CanvasProps["camera"];
  /** Canvas className */
  className?: string;
  /** Canvas style */
  style?: React.CSSProperties;
  /** Additional Canvas props */
  canvasProps?: Omit<CanvasProps, "shadows" | "camera" | "className" | "style">;
}

/**
 * Convenience wrapper that sets up a `<Canvas>` with a `<ThreeRenderer>` inside.
 *
 * @example
 * ```tsx
 * <ThreeCanvas
 *   spec={spec}
 *   registry={registry}
 *   shadows
 *   camera={{ position: [5, 5, 5], fov: 50 }}
 *   style={{ width: "100%", height: "100vh" }}
 * />
 * ```
 */
export function ThreeCanvas({
  shadows,
  camera,
  className,
  style,
  canvasProps,
  ...rendererProps
}: ThreeCanvasProps) {
  return (
    <Canvas
      shadows={shadows}
      camera={camera}
      className={className}
      style={style}
      {...canvasProps}
    >
      <ThreeRenderer {...rendererProps} />
    </Canvas>
  );
}

import React from "react";
import type { Spec } from "@json-render/core";

/**
 * Props for StartLoading.
 */
export interface StartLoadingProps {
  /** Optional loading UI spec */
  loadingSpec?: Spec | null;
}

/**
 * Loading component for json-render TanStack Start apps.
 *
 * If a loading spec is provided, it will be rendered by the PageRenderer.
 * Otherwise renders a minimal default loading indicator.
 *
 * Use as the route's `pendingComponent`:
 *
 * ```tsx
 * export const Route = createFileRoute("/$")({
 *   pendingComponent: StartLoading,
 * });
 * ```
 */
export function StartLoading({ loadingSpec: _loadingSpec }: StartLoadingProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "200px",
      }}
    >
      <div
        style={{
          width: "2rem",
          height: "2rem",
          border: "2px solid #e5e7eb",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "jr-spin 0.6s linear infinite",
        }}
      />
      <style>{`@keyframes jr-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

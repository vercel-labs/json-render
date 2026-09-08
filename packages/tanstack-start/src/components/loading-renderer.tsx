import React from "react";
import type { Spec } from "@json-render/core";
import { PageRenderer } from "./page-renderer";
import { useOptionalStartApp } from "./provider";

export interface StartLoadingProps {
  loadingSpec?: Spec | null;
}

/** Render a route-specific pending spec or a small default spinner. */
export function StartLoading({ loadingSpec }: StartLoadingProps = {}) {
  const context = useOptionalStartApp();
  if (loadingSpec && context) {
    return <PageRenderer spec={loadingSpec} loading />;
  }

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

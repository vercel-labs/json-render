import React from "react";
import type { Spec } from "@json-render/core";
import { PageRenderer } from "./page-renderer";
import { useOptionalStartApp } from "./provider";

/** Props accepted by TanStack Router's `errorComponent`. */
export interface StartErrorBoundaryProps {
  error: Error;
  reset: () => void;
  errorSpec?: Spec | null;
}

/** Render a route-specific error spec or a small default error view. */
export function StartErrorBoundary({
  error,
  reset,
  errorSpec,
}: StartErrorBoundaryProps) {
  const context = useOptionalStartApp();
  if (errorSpec && context) {
    return <PageRenderer spec={errorSpec} />;
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2 style={{ marginBottom: "1rem" }}>Something went wrong</h2>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}

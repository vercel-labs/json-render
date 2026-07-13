import React from "react";

/**
 * Not-found component for json-render TanStack Start apps.
 *
 * Renders when the pathname does not match any route in the spec.
 *
 * Use as the route's `notFoundComponent`:
 *
 * ```tsx
 * export const Route = createFileRoute("/$")({
 *   notFoundComponent: StartNotFound,
 * });
 * ```
 */
export function StartNotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "4rem", fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ color: "#666", marginTop: "0.5rem", fontSize: "1.125rem" }}>
        This page could not be found.
      </p>
    </div>
  );
}

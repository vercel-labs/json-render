import React from "react";
import type { NotFoundRouteProps } from "@tanstack/react-router";
import type { Spec } from "@json-render/core";
import { PageRenderer } from "./page-renderer";
import { useOptionalStartApp } from "./provider";

export interface StartNotFoundProps extends Partial<NotFoundRouteProps> {
  notFoundSpec?: Spec | null;
}

/** Render a route-specific not-found spec or a small default 404 view. */
export function StartNotFound({ notFoundSpec }: StartNotFoundProps = {}) {
  const context = useOptionalStartApp();
  if (notFoundSpec && context) {
    return <PageRenderer spec={notFoundSpec} />;
  }

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

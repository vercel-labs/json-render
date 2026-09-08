import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import type { StartAppSpec } from "../types";
import { resolveRouteFallback } from "./route-fallback";

function page(type: string): Spec {
  return {
    root: "root",
    elements: { root: { type, props: {}, children: [] } },
  };
}

describe("resolveRouteFallback", () => {
  const loading = page("Loading");
  const error = page("Error");
  const notFound = page("NotFound");
  const spec: StartAppSpec = {
    routes: {
      "/blog/$slug": {
        page: page("Page"),
        loading,
        error,
        notFound,
      },
    },
  };

  it("resolves each fallback from the matched route", () => {
    expect(resolveRouteFallback(spec, "/blog/post", "loading", undefined)).toBe(
      loading,
    );
    expect(resolveRouteFallback(spec, "/blog/post", "error", undefined)).toBe(
      error,
    );
    expect(
      resolveRouteFallback(spec, "/blog/post", "notFound", undefined),
    ).toBe(notFound);
  });

  it("prefers an explicit fallback and allows null to disable one", () => {
    const explicit = page("Explicit");
    expect(resolveRouteFallback(spec, "/blog/post", "loading", explicit)).toBe(
      explicit,
    );
    expect(
      resolveRouteFallback(spec, "/blog/post", "loading", null),
    ).toBeNull();
  });
});

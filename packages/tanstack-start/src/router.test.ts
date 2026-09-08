import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import { collectStaticPaths, matchRoute, splatToPath } from "./router";
import type { StartAppSpec, StartRouteSpec } from "./types";

function page(): Spec {
  return {
    root: "root",
    elements: { root: { type: "Card", props: {}, children: [] } },
  };
}

function specWith(
  routes: Record<string, Partial<StartRouteSpec>>,
): StartAppSpec {
  return {
    routes: Object.fromEntries(
      Object.entries(routes).map(([pattern, route]) => [
        pattern,
        { page: page(), ...route },
      ]),
    ),
  };
}

describe("matchRoute", () => {
  it("matches root and static routes", () => {
    const spec = specWith({ "/": {}, "/about": {} });
    expect(matchRoute(spec, "")?.pattern).toBe("/");
    expect(matchRoute(spec, "/about")?.pattern).toBe("/about");
  });

  it("extracts dynamic parameters", () => {
    const matched = matchRoute(specWith({ "/blog/$slug": {} }), "/blog/hello");
    expect(matched?.params).toEqual({ slug: "hello" });
  });

  it("captures zero or more splat segments under _splat", () => {
    const spec = specWith({ "/docs/$": {} });
    expect(matchRoute(spec, "/docs")?.params).toEqual({ _splat: [] });
    expect(matchRoute(spec, "/docs/guides/intro")?.params).toEqual({
      _splat: ["guides", "intro"],
    });
  });

  it("ranks static, dynamic, then splat routes", () => {
    const spec = specWith({
      "/blog/$": {},
      "/blog/$slug": {},
      "/blog/featured": {},
    });
    expect(matchRoute(spec, "/blog/featured")?.pattern).toBe("/blog/featured");
    expect(matchRoute(spec, "/blog/post")?.pattern).toBe("/blog/$slug");
    expect(matchRoute(spec, "/blog/2026/post")?.pattern).toBe("/blog/$");
  });

  it("returns null for an unmatched path", () => {
    expect(matchRoute(specWith({ "/": {} }), "/missing")).toBeNull();
  });
});

describe("static paths", () => {
  it("converts splat arrays to pathnames", () => {
    expect(splatToPath(undefined)).toBe("/");
    expect(splatToPath(["docs", "intro"])).toBe("/docs/intro");
  });

  it("includes static routes and expands dynamic route params", () => {
    const spec = specWith({
      "/": {},
      "/about": {},
      "/blog/$slug": {
        staticParams: [{ slug: "hello" }, { slug: "world" }],
      },
      "/docs/$": { staticParams: [{ _splat: "guides/intro" }] },
      "/users/$id": {},
    });
    expect(collectStaticPaths(spec)).toEqual([
      "/",
      "/about",
      "/blog/hello",
      "/blog/world",
      "/docs/guides/intro",
    ]);
  });
});

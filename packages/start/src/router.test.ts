import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import type { StartAppSpec, StartRouteSpec } from "./types";
import { matchRoute, splatToPath, collectStaticPaths } from "./router";

function page(): Spec {
  return {
    root: "root",
    elements: {
      root: { type: "Card", props: {}, children: [] },
    },
  };
}

function specWith(
  routes: Record<string, Partial<StartRouteSpec>>,
): StartAppSpec {
  const full: Record<string, StartRouteSpec> = {};
  for (const [pattern, route] of Object.entries(routes)) {
    full[pattern] = { page: page(), ...route };
  }
  return { routes: full };
}

describe("matchRoute", () => {
  it("matches the root route", () => {
    const spec = specWith({ "/": {} });
    const matched = matchRoute(spec, "/");
    expect(matched?.pattern).toBe("/");
    expect(matched?.params).toEqual({});
  });

  it("normalizes an empty pathname to the root route", () => {
    const spec = specWith({ "/": {} });
    expect(matchRoute(spec, "")?.pattern).toBe("/");
  });

  it("matches static routes", () => {
    const spec = specWith({ "/": {}, "/about": {} });
    expect(matchRoute(spec, "/about")?.pattern).toBe("/about");
  });

  it("extracts dynamic segment params", () => {
    const spec = specWith({ "/blog/$slug": {} });
    const matched = matchRoute(spec, "/blog/hello-world");
    expect(matched?.pattern).toBe("/blog/$slug");
    expect(matched?.params).toEqual({ slug: "hello-world" });
  });

  it("captures splat segments as arrays under _splat", () => {
    const spec = specWith({ "/docs/$": {} });
    const matched = matchRoute(spec, "/docs/guides/intro");
    expect(matched?.pattern).toBe("/docs/$");
    expect(matched?.params).toEqual({ _splat: ["guides", "intro"] });
  });

  it("lets splat routes match zero extra segments", () => {
    const spec = specWith({ "/docs/$": {} });
    const matched = matchRoute(spec, "/docs");
    expect(matched?.pattern).toBe("/docs/$");
    expect(matched?.params).toEqual({ _splat: [] });
  });

  it("prefers static matches over dynamic ones", () => {
    const spec = specWith({ "/blog/$slug": {}, "/blog/featured": {} });
    expect(matchRoute(spec, "/blog/featured")?.pattern).toBe("/blog/featured");
    expect(matchRoute(spec, "/blog/other")?.pattern).toBe("/blog/$slug");
  });

  it("prefers dynamic matches over splat ones", () => {
    const spec = specWith({ "/docs/$": {}, "/docs/$page": {} });
    const matched = matchRoute(spec, "/docs/intro");
    expect(matched?.pattern).toBe("/docs/$page");
    expect(matched?.params).toEqual({ page: "intro" });
  });

  it("returns null when no route matches", () => {
    const spec = specWith({ "/": {}, "/about": {} });
    expect(matchRoute(spec, "/missing")).toBeNull();
  });
});

describe("splatToPath", () => {
  it("converts splat segment arrays to pathnames", () => {
    expect(splatToPath(undefined)).toBe("/");
    expect(splatToPath([])).toBe("/");
    expect(splatToPath(["blog"])).toBe("/blog");
    expect(splatToPath(["blog", "hi"])).toBe("/blog/hi");
  });
});

describe("collectStaticPaths", () => {
  it("includes static routes and skips dynamic routes without staticParams", () => {
    const spec = specWith({ "/": {}, "/about": {}, "/blog/$slug": {} });
    expect(collectStaticPaths(spec)).toEqual(["/", "/about"]);
  });

  it("expands staticParams into concrete pathnames", () => {
    const spec = specWith({
      "/": {},
      "/blog/$slug": {
        staticParams: [{ slug: "hello" }, { slug: "world" }],
      },
    });
    expect(collectStaticPaths(spec)).toEqual([
      "/",
      "/blog/hello",
      "/blog/world",
    ]);
  });

  it("expands splat staticParams under _splat", () => {
    const spec = specWith({
      "/docs/$": {
        staticParams: [{ _splat: "guides/intro" }],
      },
    });
    expect(collectStaticPaths(spec)).toEqual(["/docs/guides/intro"]);
  });
});

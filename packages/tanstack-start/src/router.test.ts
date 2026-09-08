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

  it("decodes dynamic and splat parameters", () => {
    expect(
      matchRoute(specWith({ "/blog/$slug": {} }), "/blog/hello%20world")
        ?.params,
    ).toEqual({ slug: "hello world" });
    expect(
      matchRoute(specWith({ "/docs/$": {} }), "/docs/guides/hello%20world")
        ?.params,
    ).toEqual({ _splat: "guides/hello world" });
  });

  it("does not match malformed encoded parameters", () => {
    expect(
      matchRoute(specWith({ "/blog/$slug": {} }), "/blog/%E0%A4%A"),
    ).toBeNull();
  });

  it("captures zero or more splat segments under _splat", () => {
    const spec = specWith({ "/docs/$": {} });
    expect(matchRoute(spec, "/docs")?.params).toEqual({ _splat: "" });
    expect(matchRoute(spec, "/docs/guides/intro")?.params).toEqual({
      _splat: "guides/intro",
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

  it("ranks earlier static segments ahead of later static segments", () => {
    const spec = specWith({
      "/$type/edit": {},
      "/posts/$id": {},
    });
    expect(matchRoute(spec, "/posts/edit")?.pattern).toBe("/posts/$id");
  });

  it("lets an earlier static segment outrank a later splat", () => {
    const spec = specWith({
      "/$type/edit": {},
      "/posts/$": {},
    });
    expect(matchRoute(spec, "/posts/edit")?.pattern).toBe("/posts/$");
  });

  it("matches static segments case-insensitively like TanStack Router", () => {
    expect(matchRoute(specWith({ "/about": {} }), "/ABOUT")?.pattern).toBe(
      "/about",
    );
  });

  it("returns null for an unmatched path", () => {
    expect(matchRoute(specWith({ "/": {} }), "/missing")).toBeNull();
  });
});

describe("static paths", () => {
  it("converts splat content to pathnames", () => {
    expect(splatToPath(undefined)).toBe("/");
    expect(splatToPath("docs/intro")).toBe("/docs/intro");
  });

  it("includes static routes and expands dynamic route params", () => {
    const spec = specWith({
      "/": {},
      "/about": {},
      "/blog/$slug": {
        staticParams: [{ slug: "hello" }, { slug: "world" }],
      },
      "/docs/$": { staticParams: [{ _splat: "guides/intro" }] },
      "/search/$query": { staticParams: [{ query: "hello world" }] },
      "/users/$id": {},
    });
    expect(collectStaticPaths(spec)).toEqual([
      "/",
      "/about",
      "/blog/hello",
      "/blog/world",
      "/docs/guides/intro",
      "/search/hello%20world",
    ]);
  });
});

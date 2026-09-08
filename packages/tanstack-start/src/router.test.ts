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

  it("matches static and dynamic routes with trailing slashes", () => {
    const spec = specWith({ "/about": {}, "/blog/$slug": {} });
    expect(matchRoute(spec, "/about/")?.pattern).toBe("/about");
    expect(matchRoute(spec, "/blog/hello/")?.params).toEqual({
      slug: "hello",
    });
  });

  it("matches route patterns that end in trailing slashes", () => {
    const spec = specWith({ "/about/": {}, "/blog/$slug/": {} });
    expect(matchRoute(spec, "/about/")?.pattern).toBe("/about/");
    expect(matchRoute(spec, "/blog/hello/")?.params).toEqual({
      slug: "hello",
    });
  });

  it("matches encoded and decoded static pathnames", () => {
    const spec = specWith({ "/café": {} });
    expect(matchRoute(spec, "/café")?.pattern).toBe("/café");
    expect(matchRoute(spec, "/caf%C3%A9")?.pattern).toBe("/café");
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

  it("decodes percent signs in dynamic and splat parameters exactly once", () => {
    expect(
      matchRoute(specWith({ "/coupon/$code": {} }), "/coupon/100%25")?.params,
    ).toEqual({ code: "100%" });
    expect(
      matchRoute(specWith({ "/coupon/$code": {} }), "/coupon/%2525")?.params,
    ).toEqual({ code: "%25" });
    expect(
      matchRoute(specWith({ "/docs/$": {} }), "/docs/rates/100%25")?.params,
    ).toEqual({ _splat: "rates/100%" });
  });

  it("does not match malformed encoded parameters", () => {
    expect(
      matchRoute(specWith({ "/blog/$slug": {} }), "/blog/%E0%A4%A"),
    ).toBeNull();
  });

  it("captures zero or more splat segments under _splat", () => {
    const spec = specWith({ "/docs/$": {} });
    expect(matchRoute(spec, "/docs")?.params).toEqual({ _splat: "" });
    expect(matchRoute(spec, "/docs/")?.params).toEqual({ _splat: "" });
    expect(matchRoute(spec, "/docs/guides/intro")?.params).toEqual({
      _splat: "guides/intro",
    });
  });

  it("matches an empty top-level splat at the root pathname", () => {
    expect(matchRoute(specWith({ "/$": {} }), "/")?.params).toEqual({
      _splat: "",
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

  it("emits matchable paths for route patterns with trailing slashes", () => {
    const spec = specWith({
      "/about/": {},
      "/blog/$slug/": { staticParams: [{ slug: "hello" }] },
    });
    const paths = collectStaticPaths(spec);

    expect(paths).toEqual(["/about/", "/blog/hello/"]);
    expect(
      paths.map((pathname) => matchRoute(spec, pathname)?.pattern),
    ).toEqual(["/about/", "/blog/$slug/"]);
  });

  it("round trips percent signs in static params", () => {
    const spec = specWith({
      "/coupon/$code": {
        staticParams: [{ code: "100%" }, { code: "%25" }],
      },
      "/docs/$": { staticParams: [{ _splat: "rates/100%" }] },
    });
    const paths = collectStaticPaths(spec);

    expect(paths).toEqual([
      "/coupon/100%25",
      "/coupon/%2525",
      "/docs/rates/100%25",
    ]);
    expect(paths.map((pathname) => matchRoute(spec, pathname)?.params)).toEqual(
      [{ code: "100%" }, { code: "%25" }, { _splat: "rates/100%" }],
    );
  });
});

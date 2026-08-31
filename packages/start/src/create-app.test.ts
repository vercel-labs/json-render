import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import type { StartAppSpec } from "./types";
import { createStartApp } from "./create-app";

function page(state?: Record<string, unknown>): Spec {
  return {
    root: "root",
    elements: {
      root: { type: "Card", props: {}, children: [] },
    },
    ...(state ? { state } : {}),
  };
}

describe("createStartApp", () => {
  it("resolves page data for a matched route", async () => {
    const spec: StartAppSpec = { routes: { "/": { page: page() } } };
    const { getPageData } = createStartApp({ spec });

    const data = await getPageData({ pathname: "/" });
    expect(data?.spec).toEqual(page());
    expect(data?.initialState).toBeUndefined();
    expect(data?.layoutSpec).toBeNull();
  });

  it("returns null when no route matches", async () => {
    const spec: StartAppSpec = { routes: { "/": { page: page() } } };
    const { getPageData } = createStartApp({ spec });

    expect(await getPageData({ pathname: "/missing" })).toBeNull();
  });

  it("merges global state, page state, and loader data in order", async () => {
    const spec: StartAppSpec = {
      state: { a: 1, b: 1, c: 1 },
      routes: { "/": { page: page({ b: 2, c: 2 }), loader: "load" } },
    };
    const { getPageData } = createStartApp({
      spec,
      loaders: { load: () => ({ c: 3 }) },
    });

    const data = await getPageData({ pathname: "/" });
    expect(data?.initialState).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("passes matched route params to loaders", async () => {
    const spec: StartAppSpec = {
      routes: { "/blog/$slug": { page: page(), loader: "post" } },
    };
    const { getPageData } = createStartApp({
      spec,
      loaders: { post: (params) => ({ slug: params.slug }) },
    });

    const data = await getPageData({ pathname: "/blog/hello" });
    expect(data?.initialState).toEqual({ slug: "hello" });
  });

  it("resolves layout specs by key", async () => {
    const layout = page();
    const spec: StartAppSpec = {
      layouts: { main: layout },
      routes: {
        "/": { page: page(), layout: "main" },
        "/about": { page: page(), layout: "missing" },
      },
    };
    const { getPageData } = createStartApp({ spec });

    expect((await getPageData({ pathname: "/" }))?.layoutSpec).toEqual(layout);
    expect((await getPageData({ pathname: "/about" }))?.layoutSpec).toBeNull();
  });

  it("supports async spec factory functions", async () => {
    const spec: StartAppSpec = { routes: { "/": { page: page() } } };
    const { getPageData } = createStartApp({ spec: async () => spec });

    expect(await getPageData({ pathname: "/" })).not.toBeNull();
  });

  it("compiles merged metadata into head descriptors", async () => {
    const spec: StartAppSpec = {
      metadata: { title: { default: "Site", template: "%s | Site" } },
      routes: {
        "/about": {
          page: page(),
          metadata: { title: "About", description: "About us" },
        },
      },
    };
    const { getHead } = createStartApp({ spec });

    const head = await getHead({ pathname: "/about" });
    expect(head.meta).toContainEqual({ title: "About | Site" });
    expect(head.meta).toContainEqual({
      name: "description",
      content: "About us",
    });
  });

  it("falls back to global metadata for unmatched pathnames", async () => {
    const spec: StartAppSpec = {
      metadata: { title: "Site" },
      routes: { "/": { page: page() } },
    };
    const { getHead } = createStartApp({ spec });

    const head = await getHead({ pathname: "/missing" });
    expect(head.meta).toContainEqual({ title: "Site" });
  });

  it("collects static paths for prerendering", async () => {
    const spec: StartAppSpec = {
      routes: {
        "/": { page: page() },
        "/blog/$slug": {
          page: page(),
          staticParams: [{ slug: "hello" }],
        },
      },
    };
    const { getStaticPaths } = createStartApp({ spec });

    expect(await getStaticPaths()).toEqual(["/", "/blog/hello"]);
  });
});

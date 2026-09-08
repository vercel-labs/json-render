import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import { createStartApp } from "./create-app";
import type { StartAppSpec } from "./types";

function page(state?: Record<string, unknown>): Spec {
  return {
    root: "root",
    elements: { root: { type: "Card", props: {}, children: [] } },
    ...(state ? { state } : {}),
  };
}

describe("createStartApp", () => {
  it("resolves page and layout data", async () => {
    const layout = page();
    const spec: StartAppSpec = {
      layouts: { main: layout },
      routes: { "/": { page: page(), layout: "main" } },
    };
    const data = await createStartApp({ spec }).getPageData({ pathname: "/" });
    expect(data?.spec).toEqual(page());
    expect(data?.layoutSpec).toEqual(layout);
  });

  it("returns null for an unmatched pathname", async () => {
    const spec: StartAppSpec = { routes: { "/": { page: page() } } };
    const data = await createStartApp({ spec }).getPageData({
      pathname: "/missing",
    });
    expect(data).toBeNull();
  });

  it("merges global, layout, page, and loader state in order", async () => {
    const spec: StartAppSpec = {
      state: { a: 1, b: 1, c: 1 },
      layouts: { main: page({ b: 2, c: 2, layout: true }) },
      routes: {
        "/blog/$slug": {
          page: page({ c: 3, page: true }),
          layout: "main",
          loader: "post",
        },
      },
    };
    const app = createStartApp({
      spec,
      loaders: {
        post: (params) => ({ c: 4, slug: params.slug }),
      },
    });
    expect(
      (await app.getPageData({ pathname: "/blog/hello" }))?.initialState,
    ).toEqual({
      a: 1,
      b: 2,
      c: 4,
      layout: true,
      page: true,
      slug: "hello",
    });
  });

  it("supports async spec factories", async () => {
    const spec: StartAppSpec = { routes: { "/": { page: page() } } };
    const data = await createStartApp({ spec: async () => spec }).getPageData({
      pathname: "/",
    });
    expect(data).not.toBeNull();
  });

  it("resolves head metadata and static paths", async () => {
    const spec: StartAppSpec = {
      metadata: { title: { default: "Site", template: "%s | Site" } },
      routes: {
        "/about": {
          page: page(),
          metadata: { title: "About", description: "About us" },
        },
        "/blog/$slug": {
          page: page(),
          staticParams: [{ slug: "hello" }],
        },
      },
    };
    const app = createStartApp({ spec });
    const head = await app.getHead({ pathname: "/about" });
    expect(head.meta).toContainEqual({ title: "About | Site" });
    expect(head.meta).toContainEqual({
      name: "description",
      content: "About us",
    });
    expect(await app.getStaticPaths()).toEqual(["/about", "/blog/hello"]);
  });

  it("resolves route metadata from an encoded static pathname", async () => {
    const spec: StartAppSpec = {
      metadata: { title: "Global" },
      routes: {
        "/café": {
          page: page(),
          metadata: { title: "Café" },
        },
      },
    };
    const app = createStartApp({ spec });

    expect(await app.getPageData({ pathname: "/café" })).not.toBeNull();
    expect((await app.getHead({ pathname: "/caf%C3%A9" })).meta).toContainEqual(
      {
        title: "Café",
      },
    );
  });
});

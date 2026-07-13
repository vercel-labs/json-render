import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import type { StartAppSpec, StartMetadata } from "./types";
import { resolveMetadata, metadataToHead } from "./metadata";

function page(): Spec {
  return {
    root: "root",
    elements: {
      root: { type: "Card", props: {}, children: [] },
    },
  };
}

function specWith(
  globalMetadata?: StartMetadata,
  routeMetadata?: StartMetadata,
): { spec: StartAppSpec; route: StartAppSpec["routes"][string] } {
  const route = { page: page(), metadata: routeMetadata };
  return {
    spec: { metadata: globalMetadata, routes: { "/": route } },
    route,
  };
}

describe("resolveMetadata", () => {
  it("returns an empty object when no metadata is defined", () => {
    const { spec, route } = specWith();
    expect(resolveMetadata(spec, route)).toEqual({});
  });

  it("lets route metadata override global scalar fields", () => {
    const { spec, route } = specWith(
      { description: "Global" },
      { description: "Route" },
    );
    expect(resolveMetadata(spec, route).description).toBe("Route");
  });

  it("applies the global title template to route titles", () => {
    const { spec, route } = specWith(
      { title: { default: "Site", template: "%s | Site" } },
      { title: "About" },
    );
    expect(resolveMetadata(spec, route).title).toBe("About | Site");
  });

  it("falls back to the global default title when the route has none", () => {
    const { spec, route } = specWith({
      title: { default: "Site", template: "%s | Site" },
    });
    expect(resolveMetadata(spec, route).title).toBe("Site");
  });

  it("ignores the template for absolute route titles", () => {
    const { spec, route } = specWith(
      { title: { default: "Site", template: "%s | Site" } },
      { title: { absolute: "Standalone", default: "Standalone" } },
    );
    expect(metadataToHead(resolveMetadata(spec, route)).meta).toContainEqual({
      title: "Standalone",
    });
  });

  it("shallow-merges openGraph and twitter fields", () => {
    const { spec, route } = specWith(
      { openGraph: { siteName: "Site", type: "website" } },
      { openGraph: { title: "Post", type: "article" } },
    );
    expect(resolveMetadata(spec, route).openGraph).toEqual({
      siteName: "Site",
      type: "article",
      title: "Post",
    });
  });
});

describe("metadataToHead", () => {
  it("returns empty descriptors for empty metadata", () => {
    expect(metadataToHead({})).toEqual({ meta: [], links: [] });
  });

  it("compiles title, description, and keywords", () => {
    const { meta } = metadataToHead({
      title: "Home",
      description: "Welcome",
      keywords: ["json", "render"],
    });
    expect(meta).toEqual([
      { title: "Home" },
      { name: "description", content: "Welcome" },
      { name: "keywords", content: "json, render" },
    ]);
  });

  it("compiles openGraph and twitter descriptors", () => {
    const { meta } = metadataToHead({
      openGraph: { title: "OG", images: ["/a.png", "/b.png"] },
      twitter: { card: "summary_large_image", images: "/c.png" },
    });
    expect(meta).toContainEqual({ property: "og:title", content: "OG" });
    expect(meta).toContainEqual({ property: "og:image", content: "/a.png" });
    expect(meta).toContainEqual({ property: "og:image", content: "/b.png" });
    expect(meta).toContainEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
    expect(meta).toContainEqual({ name: "twitter:image", content: "/c.png" });
  });

  it("compiles robots objects into directive strings", () => {
    const { meta } = metadataToHead({ robots: { index: false } });
    expect(meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  });

  it("compiles canonical URLs and icons into links", () => {
    const { links } = metadataToHead({
      alternates: { canonical: "https://example.com" },
      icons: { icon: "/favicon.ico", apple: "/apple.png" },
    });
    expect(links).toEqual([
      { rel: "canonical", href: "https://example.com" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple.png" },
    ]);
  });

  it("supports string icons", () => {
    const { links } = metadataToHead({ icons: "/favicon.ico" });
    expect(links).toEqual([{ rel: "icon", href: "/favicon.ico" }]);
  });
});

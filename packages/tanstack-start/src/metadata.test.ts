import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import { metadataToHead, resolveMetadata } from "./metadata";
import type { StartAppSpec, StartMetadata } from "./types";

const page: Spec = {
  root: "root",
  elements: { root: { type: "Card", props: {}, children: [] } },
};

function withMetadata(global?: StartMetadata, route?: StartMetadata) {
  const routeSpec = { page, metadata: route };
  return {
    spec: { metadata: global, routes: { "/": routeSpec } } as StartAppSpec,
    route: routeSpec,
  };
}

describe("metadata", () => {
  it("applies title templates safely to every placeholder", () => {
    const { spec, route } = withMetadata(
      { title: { default: "Site", template: "%s | Site | %s" } },
      { title: "Cash $& Carry" },
    );
    expect(resolveMetadata(spec, route).title).toBe(
      "Cash $& Carry | Site | Cash $& Carry",
    );
  });

  it("honors absolute titles and shallow-merges social metadata", () => {
    const { spec, route } = withMetadata(
      {
        title: { default: "Site", template: "%s | Site" },
        openGraph: { siteName: "Site", type: "website" },
      },
      {
        title: { default: "Page", absolute: "Standalone" },
        openGraph: { title: "Page", type: "article" },
      },
    );
    expect(resolveMetadata(spec, route)).toMatchObject({
      title: "Standalone",
      openGraph: { siteName: "Site", title: "Page", type: "article" },
    });
  });

  it("builds TanStack head meta and link descriptors", () => {
    const head = metadataToHead({
      title: "Home",
      description: "Welcome",
      keywords: ["json", "render"],
      openGraph: { images: ["/a.png", "/b.png"] },
      twitter: { card: "summary_large_image", images: "/c.png" },
      robots: { index: false },
      alternates: { canonical: "https://example.com" },
      icons: { icon: "/favicon.ico", apple: "/apple.png" },
    });
    expect(head.meta).toContainEqual({ title: "Home" });
    expect(head.meta).toContainEqual({
      property: "og:image",
      content: "/a.png",
    });
    expect(head.meta).toContainEqual({
      name: "robots",
      content: "noindex, follow",
    });
    expect(head.links).toEqual([
      { rel: "canonical", href: "https://example.com" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple.png" },
    ]);
  });
});

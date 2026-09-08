import type {
  HeadDescriptors,
  StartAppSpec,
  StartMetadata,
  StartRouteSpec,
} from "./types";

export type ResolvedMetadata = Record<string, unknown>;

/** Merge application metadata with a route's overrides. */
export function resolveMetadata(
  spec: StartAppSpec,
  route?: StartRouteSpec | null,
): ResolvedMetadata {
  const globalMetadata = spec.metadata;
  const routeMetadata = route?.metadata;
  if (!globalMetadata && !routeMetadata) return {};

  const result: ResolvedMetadata = {};
  const title = resolveTitle(globalMetadata?.title, routeMetadata?.title);
  if (title !== undefined) result.title = title;

  const description = routeMetadata?.description ?? globalMetadata?.description;
  if (description) result.description = description;

  const keywords = routeMetadata?.keywords ?? globalMetadata?.keywords;
  if (keywords) result.keywords = keywords;

  const openGraph = mergeObject(
    globalMetadata?.openGraph,
    routeMetadata?.openGraph,
  );
  if (openGraph) result.openGraph = openGraph;

  const twitter = mergeObject(globalMetadata?.twitter, routeMetadata?.twitter);
  if (twitter) result.twitter = twitter;

  const robots = routeMetadata?.robots ?? globalMetadata?.robots;
  if (robots) result.robots = robots;

  const alternates = routeMetadata?.alternates ?? globalMetadata?.alternates;
  if (alternates) result.alternates = alternates;

  const icons = routeMetadata?.icons ?? globalMetadata?.icons;
  if (icons) result.icons = icons;

  return result;
}

/** Convert resolved metadata to TanStack Router `head` descriptors. */
export function metadataToHead(metadata: ResolvedMetadata): HeadDescriptors {
  const meta: Record<string, string>[] = [];
  const links: Record<string, string>[] = [];
  const title = titleToString(metadata.title);

  if (title) meta.push({ title });
  if (typeof metadata.description === "string") {
    meta.push({ name: "description", content: metadata.description });
  }
  if (Array.isArray(metadata.keywords) && metadata.keywords.length > 0) {
    meta.push({ name: "keywords", content: metadata.keywords.join(", ") });
  }

  const openGraph = metadata.openGraph as
    | StartMetadata["openGraph"]
    | undefined;
  if (openGraph) {
    if (openGraph.title) {
      meta.push({ property: "og:title", content: openGraph.title });
    }
    if (openGraph.description) {
      meta.push({ property: "og:description", content: openGraph.description });
    }
    if (openGraph.type) {
      meta.push({ property: "og:type", content: openGraph.type });
    }
    if (openGraph.url)
      meta.push({ property: "og:url", content: openGraph.url });
    if (openGraph.siteName) {
      meta.push({ property: "og:site_name", content: openGraph.siteName });
    }
    if (openGraph.locale) {
      meta.push({ property: "og:locale", content: openGraph.locale });
    }
    for (const image of toArray(openGraph.images)) {
      meta.push({ property: "og:image", content: image });
    }
  }

  const twitter = metadata.twitter as StartMetadata["twitter"] | undefined;
  if (twitter) {
    if (twitter.card) {
      meta.push({ name: "twitter:card", content: twitter.card });
    }
    if (twitter.title) {
      meta.push({ name: "twitter:title", content: twitter.title });
    }
    if (twitter.description) {
      meta.push({ name: "twitter:description", content: twitter.description });
    }
    if (twitter.creator) {
      meta.push({ name: "twitter:creator", content: twitter.creator });
    }
    if (twitter.site) {
      meta.push({ name: "twitter:site", content: twitter.site });
    }
    for (const image of toArray(twitter.images)) {
      meta.push({ name: "twitter:image", content: image });
    }
  }

  const robots = metadata.robots as StartMetadata["robots"] | undefined;
  if (robots) {
    const content =
      typeof robots === "string"
        ? robots
        : [
            robots.index === false ? "noindex" : "index",
            robots.follow === false ? "nofollow" : "follow",
          ].join(", ");
    meta.push({ name: "robots", content });
  }

  const alternates = metadata.alternates as
    | StartMetadata["alternates"]
    | undefined;
  if (alternates?.canonical) {
    links.push({ rel: "canonical", href: alternates.canonical });
  }

  const icons = metadata.icons as StartMetadata["icons"] | undefined;
  if (typeof icons === "string") {
    links.push({ rel: "icon", href: icons });
  } else if (icons) {
    if (icons.icon) links.push({ rel: "icon", href: icons.icon });
    if (icons.apple) {
      links.push({ rel: "apple-touch-icon", href: icons.apple });
    }
    if (icons.shortcut) {
      links.push({ rel: "shortcut icon", href: icons.shortcut });
    }
  }

  return { meta, links };
}

function resolveTitle(
  globalTitle: StartMetadata["title"],
  routeTitle: StartMetadata["title"],
): unknown {
  if (!routeTitle && !globalTitle) return undefined;

  if (!routeTitle) {
    if (typeof globalTitle === "string") return globalTitle;
    return globalTitle?.default;
  }

  const template =
    typeof globalTitle === "object" ? globalTitle.template : undefined;

  if (typeof routeTitle === "object") {
    if (routeTitle.absolute) return routeTitle.absolute;
    return applyTitleTemplate(template, routeTitle.default);
  }

  return applyTitleTemplate(template, routeTitle);
}

function applyTitleTemplate(
  template: string | undefined,
  title: string,
): string {
  return template ? template.replace(/%s/g, () => title) : title;
}

function titleToString(title: unknown): string | undefined {
  if (typeof title === "string") return title;
  if (typeof title === "object" && title !== null) {
    const value = title as { absolute?: string; default?: string };
    return value.absolute ?? value.default;
  }
  return undefined;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function mergeObject(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!base && !override) return undefined;
  return { ...base, ...override };
}

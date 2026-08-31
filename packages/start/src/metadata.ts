import type {
  StartMetadata,
  StartAppSpec,
  StartRouteSpec,
  HeadDescriptors,
} from "./types";

/**
 * Resolved metadata as a plain object.
 * Convert to TanStack Start head descriptors with `metadataToHead`.
 */
export type ResolvedMetadata = Record<string, unknown>;

/**
 * Resolve metadata for a route by merging global spec metadata
 * with route-specific metadata.
 *
 * Merging semantics:
 * - Route metadata overrides global metadata for scalar fields
 * - Title templates from global metadata apply to route titles
 * - OpenGraph and Twitter fields are shallow-merged
 */
export function resolveMetadata(
  spec: StartAppSpec,
  route?: StartRouteSpec | null,
): ResolvedMetadata {
  const globalMeta = spec.metadata;
  const routeMeta = route?.metadata;

  if (!globalMeta && !routeMeta) return {};

  const result: ResolvedMetadata = {};

  const mergedTitle = resolveTitle(globalMeta?.title, routeMeta?.title);
  if (mergedTitle !== undefined) result.title = mergedTitle;

  const description = routeMeta?.description ?? globalMeta?.description;
  if (description) result.description = description;

  const keywords = routeMeta?.keywords ?? globalMeta?.keywords;
  if (keywords) result.keywords = keywords;

  const openGraph = mergeObject(globalMeta?.openGraph, routeMeta?.openGraph);
  if (openGraph) result.openGraph = openGraph;

  const twitter = mergeObject(globalMeta?.twitter, routeMeta?.twitter);
  if (twitter) result.twitter = twitter;

  const robots = routeMeta?.robots ?? globalMeta?.robots;
  if (robots) result.robots = robots;

  const alternates = routeMeta?.alternates ?? globalMeta?.alternates;
  if (alternates) result.alternates = alternates;

  const icons = routeMeta?.icons ?? globalMeta?.icons;
  if (icons) result.icons = icons;

  return result;
}

/**
 * Convert resolved metadata into TanStack Start `head()` descriptors.
 *
 * Produces `meta` and `links` arrays compatible with the `head` route
 * option and rendered by `<HeadContent />`.
 */
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

  const og = metadata.openGraph as StartMetadata["openGraph"] | undefined;
  if (og) {
    if (og.title) meta.push({ property: "og:title", content: og.title });
    if (og.description) {
      meta.push({ property: "og:description", content: og.description });
    }
    if (og.type) meta.push({ property: "og:type", content: og.type });
    if (og.url) meta.push({ property: "og:url", content: og.url });
    if (og.siteName) {
      meta.push({ property: "og:site_name", content: og.siteName });
    }
    if (og.locale) meta.push({ property: "og:locale", content: og.locale });
    for (const image of toArray(og.images)) {
      meta.push({ property: "og:image", content: image });
    }
  }

  const twitter = metadata.twitter as StartMetadata["twitter"] | undefined;
  if (twitter) {
    if (twitter.card)
      meta.push({ name: "twitter:card", content: twitter.card });
    if (twitter.title) {
      meta.push({ name: "twitter:title", content: twitter.title });
    }
    if (twitter.description) {
      meta.push({ name: "twitter:description", content: twitter.description });
    }
    if (twitter.creator) {
      meta.push({ name: "twitter:creator", content: twitter.creator });
    }
    if (twitter.site)
      meta.push({ name: "twitter:site", content: twitter.site });
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

/**
 * Resolve a title value considering templates.
 *
 * If global metadata defines a title template (e.g. "%s | My App"),
 * route titles are interpolated into it.
 */
function resolveTitle(
  globalTitle: StartMetadata["title"],
  routeTitle: StartMetadata["title"],
): unknown {
  if (!routeTitle && !globalTitle) return undefined;

  if (!routeTitle) {
    if (typeof globalTitle === "string") return globalTitle;
    if (typeof globalTitle === "object" && globalTitle !== null) {
      return globalTitle.default ?? undefined;
    }
    return undefined;
  }

  const template =
    typeof globalTitle === "object" && globalTitle !== null
      ? globalTitle.template
      : undefined;

  if (typeof routeTitle === "object" && routeTitle !== null) {
    if (routeTitle.absolute) return routeTitle.absolute;
    if (routeTitle.default) {
      return applyTitleTemplate(template, routeTitle.default);
    }
    return routeTitle;
  }

  return applyTitleTemplate(template, routeTitle as string);
}

/**
 * Interpolate a title into a template, replacing every `%s` occurrence
 * (mirrors Next.js, which uses a global replace). The function replacement
 * avoids `$`-pattern expansion for titles containing e.g. `$&`.
 */
function applyTitleTemplate(
  template: string | null | undefined,
  title: string,
): string {
  if (!template) return title;
  return template.replace(/%s/g, () => title);
}

/** Flatten a resolved title value into a display string. */
function titleToString(title: unknown): string | undefined {
  if (typeof title === "string") return title;
  if (typeof title === "object" && title !== null) {
    const t = title as { absolute?: string; default?: string };
    return t.absolute ?? t.default ?? undefined;
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
  if (!base) return override;
  if (!override) return base;
  return { ...base, ...override };
}

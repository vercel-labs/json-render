import type {
  StartAppSpec,
  CreateStartAppOptions,
  StartAppExports,
  PageData,
  HeadDescriptors,
} from "./types";
import { matchRoute, collectStaticPaths } from "./router";
import { resolveMetadata, metadataToHead } from "./metadata";

/**
 * Resolve the spec from the options — supports both static specs
 * and factory functions that return specs (sync or async).
 */
async function resolveSpec(
  specOrFn: StartAppSpec | (() => StartAppSpec | Promise<StartAppSpec>),
): Promise<StartAppSpec> {
  if (typeof specOrFn === "function") {
    return await specOrFn();
  }
  return specOrFn;
}

/**
 * Merge state from multiple sources: global state, page state, and loader data.
 * Later sources override earlier ones.
 */
function mergeState(
  ...sources: (Record<string, unknown> | undefined | null)[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    if (source) {
      Object.assign(result, source);
    }
  }
  return result;
}

/**
 * Create a fully wired TanStack Start application from a json-render spec.
 *
 * Returns `getPageData`, `getHead`, and `getStaticPaths` ready to be used
 * in a TanStack Start `$` splat (catch-all) route.
 *
 * @example
 * ```typescript
 * // src/lib/app.ts
 * import { createStartApp } from "@json-render/start/server";
 *
 * export const { getPageData, getHead, getStaticPaths } =
 *   createStartApp({ spec });
 *
 * // src/routes/$.tsx
 * import { createFileRoute, notFound } from "@tanstack/react-router";
 * import { getPageData, getHead } from "@/lib/app";
 * import { WebsiteRenderer } from "./renderer";
 *
 * export const Route = createFileRoute("/$")({
 *   loader: async ({ location }) => {
 *     const data = await getPageData({ pathname: location.pathname });
 *     if (!data) throw notFound();
 *     return data;
 *   },
 *   head: ({ match }) => getHead({ pathname: match.pathname }),
 *   component: () => <WebsiteRenderer {...Route.useLoaderData()} />,
 * });
 * ```
 */
export function createStartApp(
  options: CreateStartAppOptions,
): StartAppExports {
  const { spec: specOrFn, loaders } = options;

  /**
   * Resolve page data for a given pathname.
   * Returns null when no route matches.
   */
  async function getPageData({
    pathname,
  }: {
    pathname: string;
  }): Promise<PageData | null> {
    const spec = await resolveSpec(specOrFn);

    const matched = matchRoute(spec, pathname);

    if (!matched) {
      return null;
    }

    const { route } = matched;

    let loaderData: Record<string, unknown> | undefined;
    if (route.loader && loaders?.[route.loader]) {
      loaderData = await loaders[route.loader]!(matched.params);
    }

    const initialState = mergeState(
      spec.state,
      route.page.state as Record<string, unknown> | undefined,
      loaderData,
    );

    const layoutSpec =
      route.layout && spec.layouts
        ? (spec.layouts[route.layout] ?? null)
        : null;

    return {
      spec: route.page,
      initialState:
        Object.keys(initialState).length > 0 ? initialState : undefined,
      layoutSpec,
    };
  }

  /**
   * Resolve head descriptors for the matched route.
   * Merges global spec metadata with route-specific metadata and converts
   * the result into TanStack Start `head()` descriptors.
   */
  async function getHead({
    pathname,
  }: {
    pathname: string;
  }): Promise<HeadDescriptors> {
    const spec = await resolveSpec(specOrFn);
    const matched = matchRoute(spec, pathname);
    return metadataToHead(resolveMetadata(spec, matched?.route ?? null));
  }

  /**
   * Collect concrete pathnames for all statically-known routes.
   * Used by TanStack Start's `prerender.pages` config to pre-render
   * pages at build time.
   */
  async function getStaticPaths(): Promise<string[]> {
    const spec = await resolveSpec(specOrFn);
    return collectStaticPaths(spec);
  }

  return { getPageData, getHead, getStaticPaths };
}

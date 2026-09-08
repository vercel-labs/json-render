import { metadataToHead, resolveMetadata } from "./metadata";
import { collectStaticPaths, matchRoute } from "./router";
import type {
  CreateStartAppOptions,
  HeadDescriptors,
  PageData,
  StartAppExports,
  StartAppSpec,
} from "./types";

async function resolveSpec(
  specOrFactory: StartAppSpec | (() => StartAppSpec | Promise<StartAppSpec>),
): Promise<StartAppSpec> {
  return typeof specOrFactory === "function"
    ? await specOrFactory()
    : specOrFactory;
}

function mergeState(
  ...sources: (Record<string, unknown> | null | undefined)[]
): Record<string, unknown> {
  return Object.assign({}, ...sources.filter((source) => source != null));
}

/**
 * Create the route-loader, head, and prerender helpers for a TanStack Start
 * catch-all route.
 */
export function createStartApp(
  options: CreateStartAppOptions,
): StartAppExports {
  const { spec: specOrFactory, loaders } = options;

  async function getPageData({
    pathname,
  }: {
    pathname: string;
  }): Promise<PageData | null> {
    const spec = await resolveSpec(specOrFactory);
    const matched = matchRoute(spec, pathname);
    if (!matched) return null;

    const { route } = matched;
    const loader = route.loader ? loaders?.[route.loader] : undefined;
    const loaderData = loader ? await loader(matched.params) : undefined;
    const layoutSpec =
      route.layout && spec.layouts
        ? (spec.layouts[route.layout] ?? null)
        : null;
    const initialState = mergeState(
      spec.state,
      layoutSpec?.state,
      route.page.state,
      loaderData,
    );

    return {
      spec: route.page,
      initialState:
        Object.keys(initialState).length > 0 ? initialState : undefined,
      layoutSpec,
    };
  }

  async function getHead({
    pathname,
  }: {
    pathname: string;
  }): Promise<HeadDescriptors> {
    const spec = await resolveSpec(specOrFactory);
    const matched = matchRoute(spec, pathname);
    return metadataToHead(resolveMetadata(spec, matched?.route));
  }

  async function getStaticPaths(): Promise<string[]> {
    return collectStaticPaths(await resolveSpec(specOrFactory));
  }

  return { getPageData, getHead, getStaticPaths };
}

import type { Spec } from "@json-render/core";

/**
 * SEO metadata for TanStack Start pages.
 *
 * This framework-neutral shape resolves into TanStack Router `head`
 * descriptors through `metadataToHead`.
 */
export interface StartMetadata {
  /** Page title, or a title template configuration. */
  title?:
    | string
    | {
        /** Default title when no route overrides it. */
        default: string;
        /** Template containing `%s` for the route title. */
        template?: string;
        /** Absolute title that ignores the parent template. */
        absolute?: string;
      };
  description?: string;
  keywords?: string[];
  openGraph?: {
    title?: string;
    description?: string;
    images?: string | string[];
    type?: string;
    url?: string;
    siteName?: string;
    locale?: string;
  };
  twitter?: {
    card?: "summary" | "summary_large_image" | "app" | "player";
    title?: string;
    description?: string;
    images?: string | string[];
    creator?: string;
    site?: string;
  };
  robots?: string | { index?: boolean; follow?: boolean };
  alternates?: { canonical?: string };
  icons?: string | { icon?: string; apple?: string; shortcut?: string };
}

/** A route definition within a StartAppSpec. */
export interface StartRouteSpec {
  /** Page content as a standard json-render element tree. */
  page: Spec;
  metadata?: StartMetadata;
  /** Key of a reusable layout in `StartAppSpec.layouts`. */
  layout?: string;
  loading?: Spec;
  error?: Spec;
  notFound?: Spec;
  /** Name of a loader supplied to `createStartApp`. */
  loader?: string;
  /** Parameter sets used to produce concrete prerender paths. */
  staticParams?: Record<string, string>[];
}

/**
 * A full json-render application for TanStack Start.
 *
 * Route keys use TanStack Router conventions: `/`, `/blog/$slug`, and
 * `/docs/$` for a splat route.
 */
export interface StartAppSpec {
  metadata?: StartMetadata;
  routes: Record<string, StartRouteSpec>;
  /** Layouts use a `Slot` element to mark where page content is inserted. */
  layouts?: Record<string, Spec>;
  state?: Record<string, unknown>;
}

/** The result of matching a pathname against the application spec. */
export interface MatchedRoute {
  route: StartRouteSpec;
  pattern: string;
  /** Splat content is returned as a slash-delimited string under `_splat`. */
  params: Record<string, string>;
}

export type LoaderFn = (
  params: Record<string, string>,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export interface CreateStartAppOptions {
  spec: StartAppSpec | (() => StartAppSpec | Promise<StartAppSpec>);
  loaders?: Record<string, LoaderFn>;
}

/** Serializable data returned from a TanStack Start route loader. */
export interface PageData {
  spec: Spec;
  initialState?: Record<string, unknown>;
  layoutSpec?: Spec | null;
}

/** Descriptors accepted by a TanStack Router route's `head` option. */
export interface HeadDescriptors {
  meta: Record<string, string>[];
  links: Record<string, string>[];
}

export interface StartAppExports {
  /** Resolve serializable page data for a pathname, or null when unmatched. */
  getPageData: (props: { pathname: string }) => Promise<PageData | null>;
  /** Resolve metadata for a route's `head` option. */
  getHead: (props: { pathname: string }) => Promise<HeadDescriptors>;
  /** Get concrete pathnames for TanStack Start prerendering. */
  getStaticPaths: () => Promise<string[]>;
}

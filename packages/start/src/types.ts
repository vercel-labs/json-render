import type { Spec } from "@json-render/core";

/**
 * SEO metadata for TanStack Start pages.
 *
 * Framework-agnostic shape that resolves into TanStack Start `head()`
 * descriptors (meta/link arrays) via `metadataToHead`.
 */
export interface StartMetadata {
  /** Page title — string or template config */
  title?:
    | string
    | {
        /** Default title when no child overrides */
        default: string;
        /** Template string, use %s for the page title (e.g. "%s | My App") */
        template?: string;
        /** Absolute title that ignores parent templates */
        absolute?: string;
      };
  /** Meta description */
  description?: string;
  /** Keywords for SEO */
  keywords?: string[];
  /** Open Graph metadata */
  openGraph?: {
    title?: string;
    description?: string;
    images?: string | string[];
    type?: string;
    url?: string;
    siteName?: string;
    locale?: string;
  };
  /** Twitter card metadata */
  twitter?: {
    card?: "summary" | "summary_large_image" | "app" | "player";
    title?: string;
    description?: string;
    images?: string | string[];
    creator?: string;
    site?: string;
  };
  /** Robots directives */
  robots?: string | { index?: boolean; follow?: boolean };
  /** Canonical URL */
  alternates?: {
    canonical?: string;
  };
  /** Favicon and icons */
  icons?: string | { icon?: string; apple?: string; shortcut?: string };
}

/**
 * A route definition within a StartAppSpec.
 */
export interface StartRouteSpec {
  /** Page content — standard json-render element tree */
  page: Spec;
  /** Per-route metadata for SEO */
  metadata?: StartMetadata;
  /** Layout key referencing an entry in StartAppSpec.layouts */
  layout?: string;
  /** Loading state element tree (rendered while loaders are pending) */
  loading?: Spec;
  /** Error state element tree */
  error?: Spec;
  /** Not-found element tree (for dynamic routes that don't match data) */
  notFound?: Spec;
  /** Server-side data loader name (references loaders in createStartApp) */
  loader?: string;
  /** Static params for prerendering (each entry produces one concrete path) */
  staticParams?: Record<string, string>[];
}

/**
 * The full application spec for @json-render/start.
 *
 * Describes an entire TanStack Start application: routes, pages, layouts,
 * metadata, and server-side data loading.
 *
 * Routes are keyed by URL patterns using TanStack Router conventions:
 * - `"/"` — exact match
 * - `"/blog/$slug"` — dynamic segment
 * - `"/docs/$"` — splat (catch-all) segment, matches zero or more segments
 */
export interface StartAppSpec {
  /** Root-level metadata applied to all routes (routes can override) */
  metadata?: StartMetadata;
  /** Route definitions keyed by URL pattern */
  routes: Record<string, StartRouteSpec>;
  /**
   * Reusable layout element trees. Each layout spec must include a
   * `Slot` component type where page content will be injected.
   */
  layouts?: Record<string, Spec>;
  /** Global initial state shared across all routes */
  state?: Record<string, unknown>;
}

/**
 * Result of matching a pathname against the spec's routes.
 */
export interface MatchedRoute {
  /** The matched route spec */
  route: StartRouteSpec;
  /** The URL pattern that matched (e.g. "/blog/$slug") */
  pattern: string;
  /**
   * Extracted route parameters (e.g. `{ slug: "hello-world" }`).
   * Splat segments are captured as arrays under `_splat`
   * (e.g. `{ _splat: ["a", "b"] }` for "/docs/a/b" against "/docs/$").
   */
  params: Record<string, string | string[]>;
}

/**
 * Server-side data loader function signature.
 * Receives route params and returns data to merge into initial state.
 */
export type LoaderFn = (
  params: Record<string, string | string[]>,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

/**
 * Options for createStartApp.
 */
export interface CreateStartAppOptions {
  /** The application spec */
  spec: StartAppSpec | (() => StartAppSpec | Promise<StartAppSpec>);
  /** Server-side data loaders keyed by name */
  loaders?: Record<string, LoaderFn>;
}

/**
 * Data returned by getPageData for client-side rendering.
 */
export interface PageData {
  /** Page element tree spec */
  spec: Spec;
  /** Initial state (merged from spec.state, global state, and loader data) */
  initialState?: Record<string, unknown>;
  /** Optional layout element tree spec */
  layoutSpec?: Spec | null;
}

/**
 * Head descriptors compatible with TanStack Start's `head()` route option.
 */
export interface HeadDescriptors {
  /** Meta descriptors ({ title } or { name/property, content }) */
  meta: Record<string, string>[];
  /** Link descriptors ({ rel, href }) */
  links: Record<string, string>[];
}

/**
 * The result of createStartApp — exports for TanStack Start route files.
 */
export interface StartAppExports {
  /**
   * Resolve page data for a given pathname.
   * Returns null if no route matches (caller should throw notFound()).
   *
   * Use this in a catch-all route's loader alongside a component that
   * renders PageRenderer:
   *
   * ```tsx
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
  getPageData: (props: { pathname: string }) => Promise<PageData | null>;
  /** Resolve head descriptors for the route's head() option */
  getHead: (props: { pathname: string }) => Promise<HeadDescriptors>;
  /** Concrete pathnames for prerendering (TanStack Start `pages` config) */
  getStaticPaths: () => Promise<string[]>;
}

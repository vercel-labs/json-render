import type { StartAppSpec, MatchedRoute } from "./types";

interface CompiledRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  /** Whether the last segment is a splat (catch-all) */
  splat: boolean;
  /** Number of static segments (higher = more specific) */
  specificity: number;
}

/** Param name used for splat segments, following TanStack Router. */
const SPLAT_PARAM = "_splat";

/**
 * Compile a TanStack Router route pattern into a regex matcher.
 *
 * Supports:
 * - Static segments: `/about`, `/blog`
 * - Dynamic segments: `/blog/$slug`
 * - Splat (catch-all) segments: `/docs/$` — matches zero or more segments
 */
function compileRoute(pattern: string): CompiledRoute {
  const paramNames: string[] = [];
  let splat = false;
  let specificity = 0;

  const segments = pattern === "/" ? [""] : pattern.split("/").slice(1);
  const regexParts: string[] = [];

  for (const segment of segments) {
    if (segment === "$") {
      paramNames.push(SPLAT_PARAM);
      splat = true;
      regexParts.push("(?:/(.+))?");
    } else if (segment.startsWith("$") && segment.length > 1) {
      const paramName = segment.slice(1);
      paramNames.push(paramName);
      regexParts.push("/([^/]+)");
    } else {
      specificity++;
      regexParts.push(`/${escapeRegExp(segment)}`);
    }
  }

  const regexStr = pattern === "/" ? "^/$" : `^${regexParts.join("")}$`;

  return {
    pattern,
    regex: new RegExp(regexStr),
    paramNames,
    splat,
    specificity,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a pathname against a spec's routes.
 *
 * Routes are matched in order of specificity:
 * 1. Exact/static matches first (most specific)
 * 2. Dynamic segment matches
 * 3. Splat (catch-all) matches (least specific)
 *
 * @returns The matched route with extracted params, or null if no match.
 */
export function matchRoute(
  spec: StartAppSpec,
  pathname: string,
): MatchedRoute | null {
  const normalizedPath = pathname === "" ? "/" : pathname;

  const compiled = Object.keys(spec.routes).map(compileRoute);

  compiled.sort((a, b) => {
    if (a.splat !== b.splat) {
      return a.splat ? 1 : -1;
    }
    if (a.specificity !== b.specificity) {
      return b.specificity - a.specificity;
    }
    return a.paramNames.length - b.paramNames.length;
  });

  for (const route of compiled) {
    const match = route.regex.exec(normalizedPath);
    if (!match) continue;

    const params: Record<string, string | string[]> = {};
    for (let i = 0; i < route.paramNames.length; i++) {
      const value = match[i + 1];
      const name = route.paramNames[i]!;

      if (name === SPLAT_PARAM) {
        params[name] = value ? value.split("/") : [];
      } else {
        params[name] = value ?? "";
      }
    }

    return {
      route: spec.routes[route.pattern]!,
      pattern: route.pattern,
      params,
    };
  }

  return null;
}

/**
 * Convert a splat segment array to a pathname.
 *
 * @example
 * splatToPath(undefined)     // "/"
 * splatToPath([])            // "/"
 * splatToPath(["blog"])      // "/blog"
 * splatToPath(["blog","hi"]) // "/blog/hi"
 */
export function splatToPath(splat: string[] | undefined): string {
  if (!splat || splat.length === 0) return "/";
  return "/" + splat.join("/");
}

/**
 * Collect all concrete pathnames from the spec for prerendering.
 * Returns paths suitable for TanStack Start's `prerender.pages` config.
 */
export function collectStaticPaths(spec: StartAppSpec): string[] {
  const results: string[] = [];

  for (const [pattern, route] of Object.entries(spec.routes)) {
    if (route.staticParams) {
      for (const paramSet of route.staticParams) {
        const path = buildPathFromPattern(pattern, paramSet);
        if (path) results.push(path);
      }
    } else if (!pattern.includes("$")) {
      results.push(pattern);
    }
  }

  return results;
}

/**
 * Build a concrete pathname from a route pattern and a set of params.
 */
function buildPathFromPattern(
  pattern: string,
  params: Record<string, string>,
): string | null {
  if (pattern === "/") return "/";

  const segments = pattern.split("/").slice(1);
  const result: string[] = [];

  for (const segment of segments) {
    if (segment === "$") {
      const value = params[SPLAT_PARAM];
      if (value) result.push(...value.split("/"));
    } else if (segment.startsWith("$") && segment.length > 1) {
      const paramName = segment.slice(1);
      const value = params[paramName];
      if (!value) return null;
      result.push(value);
    } else {
      result.push(segment);
    }
  }

  return result.length === 0 ? "/" : "/" + result.join("/");
}

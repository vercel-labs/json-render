import type { MatchedRoute, StartAppSpec } from "./types";

interface CompiledRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  segmentRanks: number[];
}

const SPLAT_PARAM = "_splat";
const STATIC_SEGMENT_RANK = 3;
const DYNAMIC_SEGMENT_RANK = 2;
const SPLAT_SEGMENT_RANK = 1;

/** Compile a TanStack Router pattern into a pathname matcher. */
function compileRoute(pattern: string): CompiledRoute {
  const paramNames: string[] = [];
  const normalizedPattern = normalizePathname(pattern);
  const segments =
    normalizedPattern === "/" ? [""] : normalizedPattern.split("/").slice(1);
  const regexParts: string[] = [];
  const segmentRanks: number[] = [];

  for (const segment of segments) {
    if (segment === "$") {
      paramNames.push(SPLAT_PARAM);
      segmentRanks.push(SPLAT_SEGMENT_RANK);
      regexParts.push("(?:/(.*))?");
    } else if (segment.startsWith("$") && segment.length > 1) {
      paramNames.push(segment.slice(1));
      segmentRanks.push(DYNAMIC_SEGMENT_RANK);
      regexParts.push("/([^/]+)");
    } else {
      segmentRanks.push(STATIC_SEGMENT_RANK);
      regexParts.push(`/${escapeRegExp(segment)}`);
    }
  }

  return {
    pattern,
    regex: new RegExp(
      normalizedPattern === "/" ? "^/$" : `^${regexParts.join("")}$`,
      "i",
    ),
    paramNames,
    segmentRanks,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match a pathname using TanStack Router's static, dynamic, and splat forms. */
export function matchRoute(
  spec: StartAppSpec,
  pathname: string,
): MatchedRoute | null {
  const normalizedPath = normalizePathname(pathname);
  const compiled = Object.keys(spec.routes).map(compileRoute);

  compiled.sort((a, b) => {
    const segmentCount = Math.max(a.segmentRanks.length, b.segmentRanks.length);
    for (let index = 0; index < segmentCount; index++) {
      const aRank = a.segmentRanks[index] ?? 0;
      const bRank = b.segmentRanks[index] ?? 0;
      if (aRank !== bRank) return bRank - aRank;
    }
    return 0;
  });

  for (const candidate of compiled) {
    const match = candidate.regex.exec(normalizedPath);
    if (!match) continue;

    const params: Record<string, string> = {};
    let validParams = true;
    for (let index = 0; index < candidate.paramNames.length; index++) {
      const name = candidate.paramNames[index]!;
      const value = match[index + 1];
      try {
        params[name] = decodeURIComponent(value ?? "");
      } catch {
        validParams = false;
        break;
      }
    }
    if (!validParams) continue;

    return {
      route: spec.routes[candidate.pattern]!,
      pattern: candidate.pattern,
      params,
    };
  }

  return null;
}

function normalizePathname(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/\/+$/, "") || "/";
  try {
    // TanStack preserves encoded percent signs in pathnames so route params
    // can decode them exactly once. Shield them while decoding static text.
    return decodeURI(withoutTrailingSlash.replace(/%25/gi, "%2525"));
  } catch {
    return withoutTrailingSlash;
  }
}

/** Convert TanStack Router splat content to a pathname. */
export function splatToPath(splat: string | undefined): string {
  if (!splat) return "/";
  return `/${splat}`;
}

/** Collect concrete pathnames suitable for TanStack Start prerendering. */
export function collectStaticPaths(spec: StartAppSpec): string[] {
  const results: string[] = [];

  for (const [pattern, route] of Object.entries(spec.routes)) {
    if (route.staticParams) {
      for (const params of route.staticParams) {
        const pathname = buildPathFromPattern(pattern, params);
        if (pathname) results.push(pathname);
      }
    } else if (!pattern.includes("$")) {
      results.push(pattern);
    }
  }

  return results;
}

function buildPathFromPattern(
  pattern: string,
  params: Record<string, string>,
): string | null {
  if (pattern === "/") return "/";

  const result: string[] = [];
  for (const segment of pattern.split("/").slice(1)) {
    if (segment === "$") {
      const value = params[SPLAT_PARAM];
      if (value) result.push(...value.split("/").map(encodeURIComponent));
    } else if (segment.startsWith("$") && segment.length > 1) {
      const value = params[segment.slice(1)];
      if (!value) return null;
      result.push(encodeURIComponent(value));
    } else {
      result.push(segment);
    }
  }

  return result.length === 0 ? "/" : `/${result.join("/")}`;
}

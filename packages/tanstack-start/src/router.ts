import type { MatchedRoute, StartAppSpec } from "./types";

interface CompiledRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  splat: boolean;
  specificity: number;
}

const SPLAT_PARAM = "_splat";

/** Compile a TanStack Router pattern into a pathname matcher. */
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
      paramNames.push(segment.slice(1));
      regexParts.push("/([^/]+)");
    } else {
      specificity++;
      regexParts.push(`/${escapeRegExp(segment)}`);
    }
  }

  return {
    pattern,
    regex: new RegExp(pattern === "/" ? "^/$" : `^${regexParts.join("")}$`),
    paramNames,
    splat,
    specificity,
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
  const normalizedPath = pathname === "" ? "/" : pathname;
  const compiled = Object.keys(spec.routes).map(compileRoute);

  compiled.sort((a, b) => {
    if (a.splat !== b.splat) return a.splat ? 1 : -1;
    if (a.specificity !== b.specificity) {
      return b.specificity - a.specificity;
    }
    return a.paramNames.length - b.paramNames.length;
  });

  for (const candidate of compiled) {
    const match = candidate.regex.exec(normalizedPath);
    if (!match) continue;

    const params: Record<string, string | string[]> = {};
    for (let index = 0; index < candidate.paramNames.length; index++) {
      const name = candidate.paramNames[index]!;
      const value = match[index + 1];
      params[name] =
        name === SPLAT_PARAM ? (value ? value.split("/") : []) : (value ?? "");
    }

    return {
      route: spec.routes[candidate.pattern]!,
      pattern: candidate.pattern,
      params,
    };
  }

  return null;
}

/** Convert splat segments to a pathname. */
export function splatToPath(splat: string[] | undefined): string {
  if (!splat || splat.length === 0) return "/";
  return `/${splat.join("/")}`;
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
      if (value) result.push(...value.split("/"));
    } else if (segment.startsWith("$") && segment.length > 1) {
      const value = params[segment.slice(1)];
      if (!value) return null;
      result.push(value);
    } else {
      result.push(segment);
    }
  }

  return result.length === 0 ? "/" : `/${result.join("/")}`;
}

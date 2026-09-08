import type { Spec } from "@json-render/core";
import { matchRoute } from "../router";
import type { StartAppSpec } from "../types";

export type RouteFallbackKind = "loading" | "error" | "notFound";

/** Resolve an explicit fallback or the fallback on the currently matched route. */
export function resolveRouteFallback(
  spec: StartAppSpec | undefined,
  pathname: string | undefined,
  kind: RouteFallbackKind,
  explicitSpec: Spec | null | undefined,
): Spec | null | undefined {
  if (explicitSpec !== undefined) return explicitSpec;
  if (!spec || pathname === undefined) return undefined;
  return matchRoute(spec, pathname)?.route[kind];
}

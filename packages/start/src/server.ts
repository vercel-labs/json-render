/**
 * @json-render/start/server — Server-safe exports
 *
 * This entry point does not import any client components or React hooks.
 * Safe to use in:
 * - Route config files (loaders, head)
 * - Server functions and API routes
 * - Build scripts
 *
 * @example
 * ```ts
 * import { schema, matchRoute } from "@json-render/start/server";
 * ```
 */

// Schema (TanStack Start app spec format)
export { schema, type StartSchema, type StartSpec } from "./schema";

// Router utilities
export { matchRoute, splatToPath, collectStaticPaths } from "./router";

// Metadata resolution
export {
  resolveMetadata,
  metadataToHead,
  type ResolvedMetadata,
} from "./metadata";

// Types
export type {
  StartAppSpec,
  StartRouteSpec,
  StartMetadata,
  MatchedRoute,
  LoaderFn,
  CreateStartAppOptions,
  StartAppExports,
  HeadDescriptors,
  PageData,
} from "./types";

// Catalog types (type-only, no runtime)
export type {
  EventHandle,
  BaseComponentProps,
  SetState,
  StateModel,
  ComponentContext,
  ComponentFn,
  Components,
  ActionFn,
  Actions,
} from "./catalog-types";

// Core types (re-exported for convenience)
export type { Spec, StateStore } from "@json-render/core";

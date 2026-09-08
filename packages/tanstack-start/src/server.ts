/** Server-safe TanStack Start helpers with no React or router imports. */

export { createStartApp } from "./create-app";
export {
  startComponentDefinitions,
  type StartComponentDefinitions,
} from "./catalog";
export { schema, type StartSchema, type StartSpec } from "./schema";
export { collectStaticPaths, matchRoute, splatToPath } from "./router";
export {
  metadataToHead,
  resolveMetadata,
  type ResolvedMetadata,
} from "./metadata";
export type {
  CreateStartAppOptions,
  HeadDescriptors,
  LoaderFn,
  MatchedRoute,
  PageData,
  StartAppExports,
  StartAppSpec,
  StartMetadata,
  StartRouteSpec,
} from "./types";
export type {
  ActionFn,
  Actions,
  BaseComponentProps,
  ComponentContext,
  ComponentFn,
  Components,
  EventHandle,
  SetState,
  StateModel,
} from "./catalog-types";
export type { Spec, StateStore } from "@json-render/core";

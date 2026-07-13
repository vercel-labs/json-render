// =============================================================================
// @json-render/start — Client exports
//
// This entry point includes React components for rendering json-render
// specs inside TanStack Start / TanStack Router applications.
// =============================================================================

// Types (re-exported for convenience)
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

// Catalog types (re-exported from @json-render/react)
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
export { createStateStore } from "@json-render/core";
export type {
  ComponentRegistry,
  ComponentRenderProps,
} from "@json-render/react";

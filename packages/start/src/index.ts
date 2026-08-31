// =============================================================================
// @json-render/start — Client exports
//
// This entry point includes React components for rendering json-render
// specs inside TanStack Start / TanStack Router applications.
// =============================================================================

// Provider + context
export {
  StartAppProvider,
  useStartApp,
  type StartAppContextValue,
  type StartAppProviderProps,
} from "./components/provider";

// Page renderer
export {
  PageRenderer,
  type PageRendererProps,
} from "./components/page-renderer";

// Error boundary
export {
  StartErrorBoundary,
  type StartErrorBoundaryProps,
} from "./components/error-boundary";

// Loading
export {
  StartLoading,
  type StartLoadingProps,
} from "./components/loading-renderer";

// Not found
export { StartNotFound } from "./components/not-found-renderer";

// Link
export { Link, type LinkProps } from "./components/link";

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

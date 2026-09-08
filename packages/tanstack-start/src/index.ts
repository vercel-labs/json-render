"use client";

// React components for TanStack Start applications.

export {
  StartAppProvider,
  useStartApp,
  type StartAppContextValue,
  type StartAppProviderProps,
} from "./components/provider";
export {
  PageRenderer,
  type PageRendererProps,
} from "./components/page-renderer";
export {
  StartErrorBoundary,
  type StartErrorBoundaryProps,
} from "./components/error-boundary";
export {
  StartLoading,
  type StartLoadingProps,
} from "./components/loading-renderer";
export {
  StartNotFound,
  type StartNotFoundProps,
} from "./components/not-found-renderer";
export { Link, type LinkProps } from "./components/link";

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
export type { ComputedFunction, Spec, StateStore } from "@json-render/core";
export { createStateStore } from "@json-render/core";
export type {
  ComponentRegistry,
  ComponentRenderProps,
} from "@json-render/react";

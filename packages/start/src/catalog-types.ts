/**
 * Catalog-aware types for @json-render/start.
 *
 * Re-exports the React catalog types since TanStack Start uses the same
 * component and action model as @json-render/react.
 */
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
} from "@json-render/react";

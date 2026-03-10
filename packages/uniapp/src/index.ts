// Composables & Providers
export {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
  type StateContextValue,
  type StateProviderProps,
} from "./composables/state";

export {
  VisibilityProvider,
  useVisibility,
  useIsVisible,
  type VisibilityContextValue,
} from "./composables/visibility";

export {
  ActionProvider,
  useActions,
  useAction,
  ConfirmDialog,
  type ActionContextValue,
  type ActionProviderProps,
  type PendingConfirmation,
  type ConfirmDialogProps,
} from "./composables/actions";

export {
  ValidationProvider,
  useOptionalValidation,
  useValidation,
  useFieldValidation,
  type ValidationContextValue,
  type ValidationProviderProps,
  type FieldValidationState,
} from "./composables/validation";

export {
  RepeatScopeProvider,
  useRepeatScope,
  type RepeatScopeValue,
} from "./composables/repeat-scope";

// Renderer
export {
  Renderer,
  JSONUIProvider,
  defineRegistry,
  createRenderer,
  type ComponentRegistry,
  type ComponentRenderProps,
  type RendererProps,
  type JSONUIProviderProps,
  type DefineRegistryResult,
  type CreateRendererProps,
  type ComponentMap,
} from "./renderer";

// Hooks
export {
  useUIStream,
  useChatUI,
  useBoundProp,
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
  useJsonRenderMessage,
  type UseUIStreamOptions,
  type UseUIStreamReturn,
  type UseChatUIOptions,
  type UseChatUIReturn,
  type ChatMessage,
  type TokenUsage,
  type DataPart,
} from "./hooks";

// Schema
export { schema, type UniAppSchema, type UniAppSpec } from "./schema";

// Core types (re-exported for convenience)
export type { Spec, StateStore, ComputedFunction } from "@json-render/core";
export { createStateStore } from "@json-render/core";

// Catalog types
export type {
  Components,
  Actions,
  ActionFn,
  ComponentFn,
  ComponentContext,
  BaseComponentProps,
  EventHandle,
  SetState,
  StateModel,
  CatalogHasActions,
} from "./catalog-types";

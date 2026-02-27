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

// Schema
export { schema, type VueSchema, type VueSpec } from "./schema";

// Core types (re-exported for convenience)
export type { Spec, StateStore, ComputedFunction } from "@json-render/core";
export { createStateStore } from "@json-render/core";

// Catalog-aware types for Vue
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
  type DataPart,
  type TokenUsage,
} from "./hooks";

// Renderer
export {
  // Registry
  defineRegistry,
  type DefineRegistryResult,
  // createRenderer (higher-level, includes providers)
  createRenderer,
  type CreateRendererProps,
  type ComponentMap,
  // Low-level
  Renderer,
  JSONUIProvider,
  type ComponentRenderProps,
  type ComponentRegistry,
  type RendererProps,
  type JSONUIProviderProps,
} from "./renderer";

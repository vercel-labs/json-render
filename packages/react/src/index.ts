// Contexts
export {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
  type StateContextValue,
  type StateProviderProps,
} from "./contexts/state";

export {
  VisibilityProvider,
  useVisibility,
  useIsVisible,
  type VisibilityContextValue,
  type VisibilityProviderProps,
} from "./contexts/visibility";

export {
  ActionProvider,
  useActions,
  useAction,
  ConfirmDialog,
  type ActionContextValue,
  type ActionProviderProps,
  type PendingConfirmation,
  type ConfirmDialogProps,
} from "./contexts/actions";

export {
  ValidationProvider,
  useValidation,
  useOptionalValidation,
  useFieldValidation,
  type ValidationContextValue,
  type ValidationProviderProps,
  type FieldValidationState,
} from "./contexts/validation";

export {
  RepeatScopeProvider,
  useRepeatScope,
  type RepeatScopeValue,
} from "./contexts/repeat-scope";

// Schema (React's spec format)
export {
  schema,
  type ReactSchema,
  type ReactSpec,
  // Backward compatibility
  elementTreeSchema,
  type ElementTreeSchema,
  type ElementTreeSpec,
} from "./schema";

// Core types (re-exported for convenience)
export type { Spec, StateStore } from "@json-render/core";
export { createStateStore } from "@json-render/core";

// Catalog-aware types for React
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
  type ComponentRenderer,
  type ComponentRegistry,
  type RendererProps,
  type JSONUIProviderProps,
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
  type DataPart,
  type TokenUsage,
} from "./hooks";

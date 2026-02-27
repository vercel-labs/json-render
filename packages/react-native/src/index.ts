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

// Schema (React Native's spec format)
export {
  schema,
  type ReactNativeSchema,
  type ReactNativeSpec,
  // Backward compatibility
  elementTreeSchema,
  type ElementTreeSchema,
  type ElementTreeSpec,
} from "./schema";

// Core types (re-exported for convenience)
export type { Spec, StateStore } from "@json-render/core";
export { createStateStore } from "@json-render/core";

// Catalog-aware types for React Native
export type {
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
  // Standard components
  standardComponents,
  createStandardActionHandlers,
} from "./renderer";

// Hooks
export {
  useUIStream,
  useBoundProp,
  flatToTree,
  type UseUIStreamOptions,
  type UseUIStreamReturn,
} from "./hooks";

// Catalog definitions
export {
  standardComponentDefinitions,
  standardActionDefinitions,
  type ComponentDefinition,
  type ActionDefinition,
} from "./catalog";

// =============================================================================
// Contexts
// =============================================================================

export {
  default as StateProvider,
  getStateContext,
  getStateValue,
  getBoundProp,
  type StateContext,
} from "./contexts/StateProvider.svelte";

export {
  default as VisibilityProvider,
  getVisibilityContext,
  isVisible,
  type VisibilityContext,
} from "./contexts/VisibilityProvider.svelte";

export {
  default as ActionProvider,
  getActionContext,
  getAction,
  type ActionContext,
  type PendingConfirmation,
} from "./contexts/ActionProvider.svelte";

export {
  default as ValidationProvider,
  getValidationContext,
  getOptionalValidationContext,
  getFieldValidation,
  type ValidationContext,
  type FieldValidationState,
} from "./contexts/ValidationProvider.svelte";

export {
  default as RepeatScopeProvider,
  getRepeatScope,
  type RepeatScopeValue,
} from "./contexts/RepeatScopeProvider.svelte";

export {
  default as FunctionsContextProvider,
  getFunctions,
  type FunctionsContext,
} from "./contexts/FunctionsContextProvider.svelte";

// =============================================================================
// Schema
// =============================================================================

export { schema, type SvelteSchema, type SvelteSpec } from "./schema.js";

// =============================================================================
// Catalog Types
// =============================================================================

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
} from "./catalog-types.js";

// =============================================================================
// Utilities
// =============================================================================

export {
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
  type DataPart,
} from "./utils.svelte.js";

// =============================================================================
// Streaming
// =============================================================================

export {
  createUIStream,
  createChatUI,
  type UIStreamOptions,
  type UIStreamReturn,
  type UIStreamState,
  type ChatUIOptions,
  type ChatUIReturn,
  type ChatMessage,
  type TokenUsage,
} from "./streaming.svelte.js";

// =============================================================================
// Registry
// =============================================================================

export {
  defineRegistry,
  createRenderer,
  type DefineRegistryResult,
  type ComponentRenderer,
  type ComponentRegistry,
} from "./renderer.js";
export { default as Renderer, type RendererProps } from "./Renderer.svelte";
export {
  default as CatalogRenderer,
  type CatalogRendererProps,
} from "./CatalogRenderer.svelte";
export {
  default as JsonUIProvider,
  type JSONUIProviderProps,
} from "./JsonUIProvider.svelte";
export { default as ConfirmDialog } from "./ConfirmDialog.svelte";
export { default as ConfirmDialogManager } from "./ConfirmDialogManager.svelte";

// =============================================================================
// Re-exports from core
// =============================================================================

export type {
  Spec,
  UIElement,
  ActionBinding,
  ActionHandler,
} from "@json-render/core";

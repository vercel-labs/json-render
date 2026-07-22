/*
 * Public API surface of @json-render/angular.
 *
 * Mirrors the shared json-render renderer contract (@json-render/react, /vue,
 * /solid) using Angular-idiomatic primitives: standalone components, dependency
 * injection, and signals.
 */

// Schema (Angular's spec format — identical grammar across renderers)
export { schema, type AngularSchema, type AngularSpec } from "./schema";

// Core types (re-exported for convenience)
export type { Spec, StateStore } from "@json-render/core";
export { createStateStore } from "@json-render/core";

// Catalog-aware types
export type {
  EventHandle,
  BaseComponentProps,
  SetState,
  StateModel,
  ComponentContext,
  ActionFn,
  Actions,
} from "./lib/types/catalog-types";
export type {
  JsonRenderComponent,
  ComponentRegistry,
} from "./lib/types/component-render.types";

// Renderer + registry
export {
  defineRegistry,
  provideJsonRender,
  type DefineRegistryResult,
  type ProvideJsonRenderOptions,
} from "./lib/registry/registry";
export {
  createRenderer,
  type CreateRendererProps,
  type CreateRendererResult,
  type ComponentMap,
} from "./lib/renderer/create-renderer";
export { JsonRendererComponent } from "./lib/renderer/json-renderer.component";

// Dependency-injection tokens (Angular equivalent of the providers' context)
export {
  JSON_RENDER_REGISTRY,
  JSON_RENDER_ACTION_HANDLERS,
  JSON_RENDER_ACTION_HANDLERS_FACTORY,
  JSON_RENDER_NAVIGATE,
  JSON_RENDER_FALLBACK,
  JSON_RENDER_FUNCTIONS,
  JSON_RENDER_DIRECTIVES,
  JSON_RENDER_VALIDATION_FUNCTIONS,
} from "./lib/registry/registry.token";

// Injectable services (Angular equivalent of the baseline contexts/hooks)
export {
  SpecStateService,
  type StateChange,
} from "./lib/services/spec-state.service";
export { VisibilityService } from "./lib/services/visibility.service";
export {
  ActionDispatcherService,
  type PendingConfirmation,
} from "./lib/services/action-dispatcher.service";
export {
  ValidationService,
  type FieldValidationState,
} from "./lib/services/validation.service";
export { RepeatScopeService } from "./lib/services/repeat-scope.service";

// Confirmation dialog: headless behavior + ready-made styled component
export { JsonRenderConfirmDialogDirective } from "./lib/renderer/confirm-dialog.directive";
export { ConfirmDialog } from "./lib/renderer/confirm-dialog.component";

// Children projection outlet
export { ChildrenOutletDirective } from "./lib/renderer/children-outlet.directive";

// Two-way binding helper (baseline `useBoundProp`)
export {
  boundProp,
  injectBoundProp,
  type BoundProp,
} from "./lib/hooks/bound-prop";

// Streaming / chat helpers (baseline hooks)
export {
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
  type DataPart,
  type TokenUsage,
} from "./lib/streaming/parts";
export {
  injectUIStream,
  type UseUIStreamOptions,
  type UseUIStreamReturn,
} from "./lib/streaming/inject-ui-stream";
export {
  injectChatUI,
  type UseChatUIOptions,
  type UseChatUIReturn,
  type ChatMessage,
} from "./lib/streaming/inject-chat-ui";
export {
  injectJsonRenderMessage,
  type JsonRenderMessage,
} from "./lib/streaming/inject-json-render-message";

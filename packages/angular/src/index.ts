export {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
  type StateContextValue,
  type StateProviderProps,
} from "./providers/state";

export {
  VisibilityProvider,
  useVisibility,
  useIsVisible,
  type VisibilityContextValue,
} from "./providers/visibility";

export {
  ActionProvider,
  useActions,
  useAction,
  ConfirmDialog,
  type ActionContextValue,
  type ActionProviderProps,
  type PendingConfirmation,
} from "./providers/actions";

export {
  ValidationProvider,
  useOptionalValidation,
  useValidation,
  useFieldValidation,
  type ValidationContextValue,
  type ValidationProviderProps,
  type FieldValidationState,
} from "./providers/validation";

export {
  RepeatScopeProvider,
  useRepeatScope,
  type RepeatScopeValue,
} from "./providers/repeat-scope";

export { schema, type AngularSchema, type AngularSpec } from "./schema";

export type { Spec, StateStore, ComputedFunction } from "@json-render/core";
export { createStateStore } from "@json-render/core";

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

export {
  defineRegistry,
  createRenderer,
  Renderer,
  JSONUIProvider,
  type DefineRegistryResult,
  type CreateRendererProps,
  type ComponentMap,
  type ComponentRenderProps,
  type ComponentRegistry,
  type ComponentRenderer,
  type RendererProps,
  type JSONUIProviderProps,
} from "./renderer";

export {
  component,
  element,
  fragment,
  normalizeVNodeArray,
  text,
  type VNode,
  type VNodeComponent,
  type VNodeElement,
  type VNodeFragment,
  type VNodeText,
} from "./vnode";

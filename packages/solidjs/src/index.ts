// Contexts
export {
  DataProvider,
  useData,
  useDataValue,
  useDataBinding,
  type DataContextValue,
  type DataProviderProps,
} from "./contexts/data";

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

// Renderer
export {
  Renderer,
  JSONUIProvider,
  createRendererFromCatalog,
  type ComponentRenderProps,
  type ComponentRenderer,
  type ComponentRegistry,
  type RendererProps,
  type JSONUIProviderProps,
} from "./renderer";

// Primitives (SolidJS naming convention: create* instead of use*)
export {
  createUIStream,
  useUIStream, // backwards compatibility alias
  flatToTree,
  type CreateUIStreamOptions,
  type CreateUIStreamReturn,
  type UseUIStreamOptions, // backwards compatibility alias
  type UseUIStreamReturn, // backwards compatibility alias
} from "./hooks";

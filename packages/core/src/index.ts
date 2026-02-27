// Types
export type {
  DynamicValue,
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  UIElement,
  FlatElement,
  Spec,
  VisibilityCondition,
  StateCondition,
  ItemCondition,
  IndexCondition,
  SingleCondition,
  AndCondition,
  OrCondition,
  StateModel,
  StateStore,
  ComponentSchema,
  ValidationMode,
  PatchOp,
  JsonPatch,
  // SpecStream types
  SpecStreamLine,
  SpecStreamCompiler,
  // Mixed stream types (chat + GenUI)
  MixedStreamCallbacks,
  MixedStreamParser,
  // AI SDK stream transform
  StreamChunk,
  SpecDataPart,
} from "./types";

export {
  DynamicValueSchema,
  DynamicStringSchema,
  DynamicNumberSchema,
  DynamicBooleanSchema,
  resolveDynamicValue,
  getByPath,
  setByPath,
  addByPath,
  removeByPath,
  findFormValue,
  // SpecStream - streaming format for building specs (RFC 6902)
  parseSpecStreamLine,
  applySpecStreamPatch,
  applySpecPatch,
  nestedToFlat,
  compileSpecStream,
  createSpecStreamCompiler,
  // Mixed stream parser (chat + GenUI)
  createMixedStreamParser,
  // AI SDK stream transform
  createJsonRenderTransform,
  pipeJsonRender,
  SPEC_DATA_PART,
  SPEC_DATA_PART_TYPE,
} from "./types";

// State Store
export type { StoreAdapterConfig } from "./state-store";
export { createStateStore } from "./state-store";

// Visibility
export type { VisibilityContext } from "./visibility";

export {
  VisibilityConditionSchema,
  evaluateVisibility,
  visibility,
} from "./visibility";

// Prop Expressions
export type {
  PropExpression,
  PropResolutionContext,
  ComputedFunction,
} from "./props";

export {
  resolvePropValue,
  resolveElementProps,
  resolveBindings,
  resolveActionParam,
} from "./props";

// Actions
export type {
  ActionBinding,
  /** @deprecated Use ActionBinding instead */
  Action,
  ActionConfirm,
  ActionOnSuccess,
  ActionOnError,
  ActionHandler,
  ActionDefinition,
  ResolvedAction,
  ActionExecutionContext,
} from "./actions";

export {
  ActionBindingSchema,
  /** @deprecated Use ActionBindingSchema instead */
  ActionSchema,
  ActionConfirmSchema,
  ActionOnSuccessSchema,
  ActionOnErrorSchema,
  resolveAction,
  executeAction,
  interpolateString,
  actionBinding,
  /** @deprecated Use actionBinding instead */
  action,
} from "./actions";

// Validation
export type {
  ValidationCheck,
  ValidationConfig,
  ValidationFunction,
  ValidationFunctionDefinition,
  ValidationCheckResult,
  ValidationResult,
  ValidationContext,
} from "./validation";

export {
  ValidationCheckSchema,
  ValidationConfigSchema,
  builtInValidationFunctions,
  runValidationCheck,
  runValidation,
  check,
} from "./validation";

// Spec Structural Validation
export type {
  SpecIssueSeverity,
  SpecIssue,
  SpecValidationIssues,
  ValidateSpecOptions,
} from "./spec-validator";

export { validateSpec, autoFixSpec, formatSpecIssues } from "./spec-validator";

// Schema — defines the grammar (how specs and catalogs are structured)
export type {
  SchemaBuilder,
  SchemaType,
  SchemaDefinition,
  Schema,
  PromptTemplate,
  SchemaOptions,
  BuiltInAction,
} from "./schema";

export { defineSchema } from "./schema";

// Catalog — defines the vocabulary (what components and actions are available)
export type {
  Catalog,
  PromptOptions,
  PromptContext,
  SpecValidationResult,
  InferCatalogInput,
  InferSpec,
  InferCatalogComponents,
  InferCatalogActions,
  InferComponentProps,
  InferActionParams,
} from "./schema";

export { defineCatalog } from "./schema";

// User Prompt Builder
export type { UserPromptOptions } from "./prompt";

export { buildUserPrompt } from "./prompt";

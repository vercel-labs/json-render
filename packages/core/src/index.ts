// Types
export type {
  DynamicValue,
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  RepeatStatePath,
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
  resolveRepeatStatePath,
  resolveRepeatItemStatePath,
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
  VisibilityConditionStrictSchema,
  conditionUsesItemScope,
  splitRepeatVisibility,
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

// Custom Directives
export type { DirectiveDefinition, DirectiveRegistry } from "./directives";

export {
  defineDirective,
  createDirectiveRegistry,
  findDirective,
} from "./directives";

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

// Action observer (devtools hook)
export type {
  ActionDispatchInfo,
  ActionSettleInfo,
  ActionObserver,
} from "./action-observer";
export {
  registerActionObserver,
  notifyActionDispatch,
  notifyActionSettle,
  nextActionDispatchId,
} from "./action-observer";

// Devtools active flag
export {
  markDevtoolsActive,
  isDevtoolsActive,
  subscribeDevtoolsActive,
} from "./devtools-flag";

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
  JsonSchemaOptions,
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

// Object diff & merge (format-agnostic)
export { deepMergeSpec } from "./merge";
export { diffToPatches } from "./diff";

// Edit modes
export type {
  EditMode,
  EditConfig,
  BuildEditUserPromptOptions,
} from "./edit-modes";
export {
  buildEditInstructions,
  buildEditUserPrompt,
  isNonEmptySpec,
} from "./edit-modes";

// Experimental composition — these APIs may change in any release.
export { experimental_composeSpec } from "./experimental-compose";
export type {
  Experimental_CompositionCatalog,
  Experimental_CompositionCandidate,
  Experimental_ChoiceQuestion,
  Experimental_CompositionEvaluation,
  Experimental_CompositionEvaluator,
  Experimental_CompositionStep,
  Experimental_CompositionEvent,
  Experimental_ComposeSpecOptions,
} from "./experimental-compose";
export { experimental_createEvaluator } from "./experimental-evaluator";
export type { Experimental_EvaluatorOptions } from "./experimental-evaluator";

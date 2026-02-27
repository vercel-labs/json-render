<script module lang="ts">
  import { getContext, hasContext } from "svelte";
  import type {
    ValidationConfig,
    ValidationFunction,
    ValidationResult,
  } from "@json-render/core";

  const VALIDATION_KEY = Symbol.for("json-render-validation");

  /**
   * Field validation state
   */
  export interface FieldValidationState {
    touched: boolean;
    validated: boolean;
    result: ValidationResult | null;
  }

  /**
   * Validation context value
   */
  export interface ValidationContext {
    /** Custom validation functions from catalog */
    customFunctions: Record<string, ValidationFunction>;
    /** Validation state by field path */
    fieldStates: Record<string, FieldValidationState>;
    /** Validate a field */
    validate: (path: string, config: ValidationConfig) => ValidationResult;
    /** Mark field as touched */
    touch: (path: string) => void;
    /** Clear validation for a field */
    clear: (path: string) => void;
    /** Validate all fields */
    validateAll: () => boolean;
    /** Register field config */
    registerField: (path: string, config: ValidationConfig) => void;
  }

  /**
   * Get the validation context from component tree
   */
  export function getValidationContext(): ValidationContext {
    const ctx = getContext<ValidationContext>(VALIDATION_KEY);
    if (!ctx) {
      throw new Error(
        "getValidationContext must be called within a ValidationProvider",
      );
    }
    return ctx;
  }

  /**
   * Get validation context if present.
   */
  export function getOptionalValidationContext(): ValidationContext | null {
    return hasContext(VALIDATION_KEY)
      ? getContext<ValidationContext>(VALIDATION_KEY)
      : null;
  }

  /**
   * Helper to get field validation state
   */
  export function getFieldValidation(
    ctx: ValidationContext,
    path: string,
    config?: ValidationConfig,
  ): {
    state: FieldValidationState;
    validate: () => ValidationResult;
    touch: () => void;
    clear: () => void;
    errors: string[];
    isValid: boolean;
  } {
    const state = ctx.fieldStates[path] ?? {
      touched: false,
      validated: false,
      result: null,
    };

    return {
      state,
      validate: () => ctx.validate(path, config ?? { checks: [] }),
      touch: () => ctx.touch(path),
      clear: () => ctx.clear(path),
      errors: state.result?.errors ?? [],
      isValid: state.result?.valid ?? true,
    };
  }
</script>

<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import {
    runValidation,
    type ValidationConfig as CoreValidationConfig,
    type ValidationFunction as CoreValidationFunction,
    type ValidationResult as CoreValidationResult,
  } from "@json-render/core";
  import { getStateContext } from "./StateProvider.svelte";

  interface Props {
    customFunctions?: Record<string, CoreValidationFunction>;
    children?: Snippet;
  }

  let { customFunctions = {}, children }: Props = $props();

  const stateCtx = getStateContext();

  let fieldStates = $state.raw<Record<string, FieldValidationState>>({});
  let fieldConfigs = $state.raw<Record<string, CoreValidationConfig>>({});

  const validate = (
    path: string,
    config: CoreValidationConfig,
  ): CoreValidationResult => {
    const segments = path.split("/").filter(Boolean);
    let value: unknown = stateCtx.state;
    for (const seg of segments) {
      if (value != null && typeof value === "object") {
        value = (value as Record<string, unknown>)[seg];
      } else {
        value = undefined;
        break;
      }
    }

    const result = runValidation(config, {
      value,
      stateModel: stateCtx.state,
      customFunctions,
    });

    fieldStates = {
      ...fieldStates,
      [path]: {
        touched: fieldStates[path]?.touched ?? true,
        validated: true,
        result,
      },
    };

    return result;
  };

  const touch = (path: string): void => {
    fieldStates = {
      ...fieldStates,
      [path]: {
        ...fieldStates[path],
        touched: true,
        validated: fieldStates[path]?.validated ?? false,
        result: fieldStates[path]?.result ?? null,
      },
    };
  };

  const clear = (path: string): void => {
    const { [path]: _, ...rest } = fieldStates;
    fieldStates = rest;
  };

  const validateAll = (): boolean => {
    let allValid = true;
    for (const [path, config] of Object.entries(fieldConfigs)) {
      const result = validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }
    return allValid;
  };

  const registerField = (path: string, config: CoreValidationConfig): void => {
    fieldConfigs = { ...fieldConfigs, [path]: config };
  };

  const ctx: ValidationContext = {
    get customFunctions() {
      return customFunctions;
    },
    get fieldStates() {
      return fieldStates;
    },
    validate,
    touch,
    clear,
    validateAll,
    registerField,
  };

  setContext(VALIDATION_KEY, ctx);
</script>

{@render children?.()}

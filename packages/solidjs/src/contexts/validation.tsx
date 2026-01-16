import {
  createContext,
  useContext,
  createSignal,
  onMount,
  type JSX,
  type Accessor,
} from "solid-js";
import {
  runValidation,
  getByPath,
  type ValidationConfig,
  type ValidationFunction,
  type ValidationResult,
} from "@json-render/core";
import { useData } from "./data";

/**
 * Field validation state
 */
export interface FieldValidationState {
  /** Whether the field has been touched */
  touched: boolean;
  /** Whether the field has been validated */
  validated: boolean;
  /** Validation result */
  result: ValidationResult | null;
}

/**
 * Validation context value
 */
export interface ValidationContextValue {
  /** Custom validation functions from catalog */
  customFunctions: Record<string, ValidationFunction>;
  /** Validation state by field path (accessor) */
  fieldStates: Accessor<Record<string, FieldValidationState>>;
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

const ValidationContext = createContext<ValidationContextValue>();

/**
 * Props for ValidationProvider
 */
export interface ValidationProviderProps {
  /** Custom validation functions from catalog */
  customFunctions?: Record<string, ValidationFunction>;
  children: JSX.Element;
}

/**
 * Provider for validation
 */
export function ValidationProvider(props: ValidationProviderProps) {
  const { data, authState } = useData();
  const customFunctions = props.customFunctions ?? {};

  const [fieldStates, setFieldStates] = createSignal<
    Record<string, FieldValidationState>
  >({});
  const [fieldConfigs, setFieldConfigs] = createSignal<
    Record<string, ValidationConfig>
  >({});

  const registerField = (path: string, config: ValidationConfig): void => {
    setFieldConfigs((prev) => ({ ...prev, [path]: config }));
  };

  const validate = (
    path: string,
    config: ValidationConfig,
  ): ValidationResult => {
    const dataModel = data();
    const value = getByPath(dataModel, path);
    const result = runValidation(config, {
      value,
      dataModel,
      customFunctions,
      authState: authState(),
    });

    setFieldStates((prev) => ({
      ...prev,
      [path]: {
        touched: prev[path]?.touched ?? true,
        validated: true,
        result,
      },
    }));

    return result;
  };

  const touch = (path: string): void => {
    setFieldStates((prev) => ({
      ...prev,
      [path]: {
        ...prev[path],
        touched: true,
        validated: prev[path]?.validated ?? false,
        result: prev[path]?.result ?? null,
      },
    }));
  };

  const clear = (path: string): void => {
    setFieldStates((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
  };

  const validateAll = (): boolean => {
    let allValid = true;

    for (const [path, config] of Object.entries(fieldConfigs())) {
      const result = validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }

    return allValid;
  };

  const value: ValidationContextValue = {
    customFunctions,
    fieldStates,
    validate,
    touch,
    clear,
    validateAll,
    registerField,
  };

  return (
    <ValidationContext.Provider value={value}>
      {props.children}
    </ValidationContext.Provider>
  );
}

/**
 * Hook to access validation context
 */
export function useValidation(): ValidationContextValue {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}

/**
 * Hook to get validation state for a field
 */
export function useFieldValidation(
  path: string,
  config?: ValidationConfig,
): {
  state: () => FieldValidationState;
  validate: () => ValidationResult;
  touch: () => void;
  clear: () => void;
  errors: () => string[];
  isValid: () => boolean;
} {
  const {
    fieldStates,
    validate: validateField,
    touch: touchField,
    clear: clearField,
    registerField,
  } = useValidation();

  // Register field on mount
  onMount(() => {
    if (config) {
      registerField(path, config);
    }
  });

  const state = (): FieldValidationState =>
    fieldStates()[path] ?? {
      touched: false,
      validated: false,
      result: null,
    };

  const validate = (): ValidationResult =>
    validateField(path, config ?? { checks: [] });

  const touch = (): void => touchField(path);
  const clear = (): void => clearField(path);

  const errors = (): string[] => state().result?.errors ?? [];
  const isValid = (): boolean => state().result?.valid ?? true;

  return {
    state,
    validate,
    touch,
    clear,
    errors,
    isValid,
  };
}

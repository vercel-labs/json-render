import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  runValidation,
  type ValidationConfig,
  type ValidationFunction,
  type ValidationResult,
} from "@json-render/core";
import { useStateStore } from "./state";

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
  /** Unregister field (removes from validateAll and clears state) */
  unregisterField: (path: string) => void;
}

const ValidationContext = createContext<ValidationContextValue | null>(null);

/**
 * Props for ValidationProvider
 */
export interface ValidationProviderProps {
  /** Custom validation functions from catalog */
  customFunctions?: Record<string, ValidationFunction>;
  children: ReactNode;
}

/**
 * Compare two DynamicValue args records shallowly.
 */
function dynamicArgsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    const va = a[key];
    const vb = b[key];
    if (va === vb) continue;
    if (
      typeof va === "object" &&
      va !== null &&
      typeof vb === "object" &&
      vb !== null
    ) {
      const sa = (va as Record<string, unknown>).$state;
      const sb = (vb as Record<string, unknown>).$state;
      if (typeof sa === "string" && sa === sb) continue;
    }
    return false;
  }
  return true;
}

/**
 * Structural equality check for ValidationConfig.
 */
function validationConfigEqual(
  a: ValidationConfig,
  b: ValidationConfig,
): boolean {
  if (a === b) return true;
  if (a.validateOn !== b.validateOn) return false;

  const ac = a.checks ?? [];
  const bc = b.checks ?? [];
  if (ac.length !== bc.length) return false;

  for (let i = 0; i < ac.length; i++) {
    const ca = ac[i]!;
    const cb = bc[i]!;
    if (ca.type !== cb.type) return false;
    if (ca.message !== cb.message) return false;
    if (!dynamicArgsEqual(ca.args, cb.args)) return false;
  }

  return true;
}

/**
 * Provider for validation
 */
export function ValidationProvider({
  customFunctions = {},
  children,
}: ValidationProviderProps) {
  const { getSnapshot } = useStateStore();
  const [fieldStates, setFieldStates] = useState<
    Record<string, FieldValidationState>
  >({});
  const [fieldConfigs, setFieldConfigs] = useState<
    Record<string, ValidationConfig>
  >({});

  const registerField = useCallback(
    (path: string, config: ValidationConfig) => {
      setFieldConfigs((prev) => {
        const existing = prev[path];
        if (existing && validationConfigEqual(existing, config)) {
          return prev;
        }
        return { ...prev, [path]: config };
      });
    },
    [],
  );

  const unregisterField = useCallback((path: string) => {
    setFieldConfigs((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
    setFieldStates((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const validate = useCallback(
    (path: string, config: ValidationConfig): ValidationResult => {
      const currentState = getSnapshot();
      const segments = path.split("/").filter(Boolean);
      let value: unknown = currentState;
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
        stateModel: currentState,
        customFunctions,
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
    },
    [getSnapshot, customFunctions],
  );

  const touch = useCallback((path: string) => {
    setFieldStates((prev) => ({
      ...prev,
      [path]: {
        ...prev[path],
        touched: true,
        validated: prev[path]?.validated ?? false,
        result: prev[path]?.result ?? null,
      },
    }));
  }, []);

  const clear = useCallback((path: string) => {
    setFieldStates((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const validateAll = useCallback(() => {
    let allValid = true;
    for (const [path, config] of Object.entries(fieldConfigs)) {
      const result = validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }
    return allValid;
  }, [fieldConfigs, validate]);

  const value = useMemo<ValidationContextValue>(
    () => ({
      customFunctions,
      fieldStates,
      validate,
      touch,
      clear,
      validateAll,
      registerField,
      unregisterField,
    }),
    [
      customFunctions,
      fieldStates,
      validate,
      touch,
      clear,
      validateAll,
      registerField,
      unregisterField,
    ],
  );

  return (
    <ValidationContext.Provider value={value}>
      {children}
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
 * Hook to optionally access validation context (returns null if outside provider).
 */
export function useOptionalValidation(): ValidationContextValue | null {
  return useContext(ValidationContext);
}

/**
 * Hook to get validation state for a field
 */
export function useFieldValidation(
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
  const {
    fieldStates,
    validate: validateField,
    touch: touchField,
    clear: clearField,
    registerField,
    unregisterField,
  } = useValidation();

  // Register whenever config changes (registerField deduplicates via structural equality)
  useEffect(() => {
    if (config) {
      registerField(path, config);
    }
  }, [path, config, registerField]);

  // Unregister only on true unmount — avoids clearing validation state
  // when config identity changes (e.g. inline objects re-created each render)
  useEffect(() => {
    return () => {
      unregisterField(path);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const state = fieldStates[path] ?? {
    touched: false,
    validated: false,
    result: null,
  };

  const validate = useCallback(
    () => validateField(path, config ?? { checks: [] }),
    [path, config, validateField],
  );

  const touch = useCallback(() => touchField(path), [path, touchField]);
  const clear = useCallback(() => clearField(path), [path, clearField]);

  return {
    state,
    validate,
    touch,
    clear,
    errors: state.result?.errors ?? [],
    isValid: state.result?.valid ?? true,
  };
}

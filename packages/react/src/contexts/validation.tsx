"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
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
}

const ValidationContext = createContext<ValidationContextValue | null>(null);
const MountedFieldRegistrationContext = createContext<
  ((path: string, config: ValidationConfig) => () => void) | null
>(null);
const EMPTY_VALIDATION_FUNCTIONS: Record<string, ValidationFunction> = {};

/**
 * Props for ValidationProvider
 */
export interface ValidationProviderProps {
  /** Custom validation functions from catalog */
  customFunctions?: Record<string, ValidationFunction>;
  children: ReactNode;
}

/** Compare JSON-like validation config values structurally. */
function validationValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => validationValueEqual(value, b[index]));
  }

  if (Array.isArray(b)) return false;

  const recordA = a as Record<string, unknown>;
  const recordB = b as Record<string, unknown>;
  const keysA = Object.keys(recordA);
  const keysB = Object.keys(recordB);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!(key in recordB)) return false;
    if (!validationValueEqual(recordA[key], recordB[key])) return false;
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
  return validationValueEqual(a, b);
}

/** Return the config that currently owns validation for a path. */
function getActiveConfig(
  registrations: Map<symbol, ValidationConfig>,
): ValidationConfig | undefined {
  let active: ValidationConfig | undefined;
  for (const config of registrations.values()) {
    active = config;
  }
  return active;
}

/** Whether any live registration uses the given validation config. */
function hasRegisteredConfig(
  registrations: Map<symbol, ValidationConfig>,
  target: ValidationConfig,
): boolean {
  for (const config of registrations.values()) {
    if (validationConfigEqual(config, target)) return true;
  }
  return false;
}

/**
 * Provider for validation
 */
export function ValidationProvider({
  customFunctions = EMPTY_VALIDATION_FUNCTIONS,
  children,
}: ValidationProviderProps) {
  const { state, getSnapshot } = useStateStore();

  const [fieldStates, setFieldStates] = useState<
    Record<string, FieldValidationState>
  >({});
  // Mutable mirror of fieldStates for synchronous reads (e.g. reading errors
  // immediately after validateAll() before React flushes the batched setState).
  const fieldStatesRef = useRef<Record<string, FieldValidationState>>({});
  // Tracks the config that produced each stored result so cleanup can tell
  // whether that result still belongs to any mounted registration.
  const fieldStateConfigsRef = useRef<Map<string, ValidationConfig>>(new Map());
  // Each mounted control gets its own registration. This lets one control
  // unregister without disabling another control bound to the same path.
  const fieldRegistrationsRef = useRef<
    Map<string, Map<symbol, ValidationConfig>>
  >(new Map());
  // Imperative registerField calls retain one durable registration per path.
  // Mounted controls use separate identities so they can unregister safely.
  const imperativeRegistrationIdsRef = useRef<Map<string, symbol>>(new Map());

  const clear = useCallback((path: string) => {
    fieldStateConfigsRef.current.delete(path);
    if (!Object.prototype.hasOwnProperty.call(fieldStatesRef.current, path)) {
      return;
    }
    const next = { ...fieldStatesRef.current };
    delete next[path];
    fieldStatesRef.current = next;
    setFieldStates(next);
  }, []);

  const registerField = useCallback(
    (path: string, config: ValidationConfig) => {
      let registrations = fieldRegistrationsRef.current.get(path);
      if (!registrations) {
        registrations = new Map();
        fieldRegistrationsRef.current.set(path, registrations);
      }

      const previousActiveConfig = getActiveConfig(registrations);
      let registrationId = imperativeRegistrationIdsRef.current.get(path);
      if (!registrationId) {
        registrationId = Symbol(path);
        imperativeRegistrationIdsRef.current.set(path, registrationId);
      }

      const existingConfig = registrations.get(registrationId);
      if (
        existingConfig &&
        previousActiveConfig &&
        validationConfigEqual(existingConfig, config) &&
        validationConfigEqual(previousActiveConfig, config)
      ) {
        return;
      }

      // Reinsert changed imperative registrations so the latest registration
      // keeps the same last-writer-wins behavior as the original path store.
      registrations.delete(registrationId);
      registrations.set(registrationId, config);
      if (
        previousActiveConfig &&
        !validationConfigEqual(previousActiveConfig, config)
      ) {
        clear(path);
      }
    },
    [clear],
  );

  const registerMountedField = useCallback(
    (path: string, config: ValidationConfig) => {
      const registrationId = Symbol(path);
      let registrations = fieldRegistrationsRef.current.get(path);
      if (!registrations) {
        registrations = new Map();
        fieldRegistrationsRef.current.set(path, registrations);
      }

      const previousActiveConfig = getActiveConfig(registrations);
      registrations.set(registrationId, config);
      if (
        previousActiveConfig &&
        !validationConfigEqual(previousActiveConfig, config)
      ) {
        clear(path);
      }

      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;

        const currentRegistrations = fieldRegistrationsRef.current.get(path);
        if (!currentRegistrations?.has(registrationId)) return;

        const activeConfigBeforeRemoval = getActiveConfig(currentRegistrations);
        currentRegistrations.delete(registrationId);
        const activeConfigAfterRemoval = getActiveConfig(currentRegistrations);
        const fieldStateConfig = fieldStateConfigsRef.current.get(path);
        const fieldStateConfigWasReleased =
          fieldStateConfig !== undefined &&
          !hasRegisteredConfig(currentRegistrations, fieldStateConfig);
        const activeConfigChanged =
          activeConfigBeforeRemoval === undefined ||
          activeConfigAfterRemoval === undefined ||
          !validationConfigEqual(
            activeConfigBeforeRemoval,
            activeConfigAfterRemoval,
          );
        const fieldStateMatchesActiveConfig =
          fieldStateConfig !== undefined &&
          activeConfigAfterRemoval !== undefined &&
          validationConfigEqual(fieldStateConfig, activeConfigAfterRemoval);

        if (currentRegistrations.size === 0) {
          fieldRegistrationsRef.current.delete(path);
        }

        if (
          !activeConfigAfterRemoval ||
          fieldStateConfigWasReleased ||
          (activeConfigChanged && !fieldStateMatchesActiveConfig)
        ) {
          clear(path);
        }
      };
    },
    [clear],
  );

  const validate = useCallback(
    (path: string, config: ValidationConfig): ValidationResult => {
      // Read from the store directly so validation sees values written in the
      // same synchronous handler (e.g. setValue then validate in onChange).
      // Using React state would return the stale pre-render snapshot.
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

      const newFieldState: FieldValidationState = {
        touched: fieldStatesRef.current[path]?.touched ?? true,
        validated: true,
        result,
      };
      fieldStatesRef.current = {
        ...fieldStatesRef.current,
        [path]: newFieldState,
      };
      fieldStateConfigsRef.current.set(path, config);
      setFieldStates(fieldStatesRef.current);

      return result;
    },
    [customFunctions, getSnapshot],
  );

  const touch = useCallback((path: string) => {
    fieldStatesRef.current = {
      ...fieldStatesRef.current,
      [path]: {
        ...fieldStatesRef.current[path],
        touched: true,
        validated: fieldStatesRef.current[path]?.validated ?? false,
        result: fieldStatesRef.current[path]?.result ?? null,
      },
    };
    setFieldStates(fieldStatesRef.current);
  }, []);

  const validateAll = useCallback(() => {
    let allValid = true;

    // Only active registrations belong in a form-wide validation result.
    // Pruning here is a final safeguard against errors from released fields.
    const activePaths = new Set(fieldRegistrationsRef.current.keys());
    const hasStaleStates = Object.keys(fieldStatesRef.current).some(
      (path) => !activePaths.has(path),
    );
    if (hasStaleStates) {
      fieldStatesRef.current = Object.fromEntries(
        Object.entries(fieldStatesRef.current).filter(([path]) =>
          activePaths.has(path),
        ),
      );
      setFieldStates(fieldStatesRef.current);
    }
    for (const path of fieldStateConfigsRef.current.keys()) {
      if (!activePaths.has(path)) {
        fieldStateConfigsRef.current.delete(path);
      }
    }

    for (const [path, registrations] of fieldRegistrationsRef.current) {
      const config = getActiveConfig(registrations);
      if (!config) continue;
      const result = validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }

    return allValid;
  }, [validate]);

  const value = useMemo<ValidationContextValue>(
    () => ({
      customFunctions,
      // Getter returns the mutable ref so callers that read fieldStates
      // synchronously after validateAll() see the latest values.
      get fieldStates() {
        return fieldStatesRef.current;
      },
      validate,
      touch,
      clear,
      validateAll,
      registerField,
    }),
    [
      customFunctions,
      // fieldStates (React state) stays in deps so the context value object
      // is recreated on re-render, triggering downstream consumers.
      fieldStates,
      validate,
      touch,
      clear,
      validateAll,
      registerField,
    ],
  );

  return (
    <ValidationContext.Provider value={value}>
      <MountedFieldRegistrationContext.Provider value={registerMountedField}>
        {children}
      </MountedFieldRegistrationContext.Provider>
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
 * Non-throwing variant of useValidation.
 * Returns null when no ValidationProvider is present.
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
  } = useValidation();
  const registerMountedField = useContext(MountedFieldRegistrationContext);
  if (!registerMountedField) {
    throw new Error(
      "useFieldValidation must be used within a ValidationProvider",
    );
  }

  // Stabilize structurally equal inline configs so unrelated re-renders do not
  // tear down and recreate a field registration.
  const stableConfigRef = useRef<ValidationConfig | undefined>(config);
  if (
    (config === undefined && stableConfigRef.current !== undefined) ||
    (config !== undefined &&
      (stableConfigRef.current === undefined ||
        !validationConfigEqual(stableConfigRef.current, config)))
  ) {
    stableConfigRef.current = config;
  }
  const stableConfig = stableConfigRef.current;

  // The returned cleanup releases this control's registration on unmount and
  // before a binding path or validation config changes.
  React.useEffect(() => {
    if (!path || !stableConfig) return;
    return registerMountedField(path, stableConfig);
  }, [path, stableConfig, registerMountedField]);

  const state = fieldStates[path] ?? {
    touched: false,
    validated: false,
    result: null,
  };

  const validate = useCallback(
    () => validateField(path, stableConfig ?? { checks: [] }),
    [path, stableConfig, validateField],
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

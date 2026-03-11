import {
  createContext,
  useContext,
  createSignal,
  createEffect,
  createMemo,
  type Accessor,
  type ParentProps,
} from "solid-js";
import {
  runValidation,
  type ValidationConfig,
  type ValidationFunction,
  type ValidationResult,
} from "@json-render/core";
import { useStateStore } from "./state";

export interface FieldValidationState {
  touched: boolean;
  validated: boolean;
  result: ValidationResult | null;
}

export interface ValidationContextValue {
  customFunctions: Record<string, ValidationFunction>;
  fieldStates: Record<string, FieldValidationState>;
  validate: (path: string, config: ValidationConfig) => ValidationResult;
  touch: (path: string) => void;
  clear: (path: string) => void;
  validateAll: () => boolean;
  registerField: (path: string, config: ValidationConfig) => void;
}

const ValidationContext = createContext<ValidationContextValue | null>(null);

export interface ValidationProviderProps {
  customFunctions?: Record<string, ValidationFunction>;
}

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

export function ValidationProvider(
  props: ParentProps<ValidationProviderProps>,
) {
  const { getSnapshot } = useStateStore();
  const customFunctions = () => props.customFunctions ?? {};

  const [fieldStates, setFieldStates] = createSignal<
    Record<string, FieldValidationState>
  >({});
  let fieldStatesRef: Record<string, FieldValidationState> = {};

  const [fieldConfigs, setFieldConfigs] = createSignal<
    Record<string, ValidationConfig>
  >({});

  const registerField = (path: string, config: ValidationConfig) => {
    setFieldConfigs((prev) => {
      const existing = prev[path];
      if (existing && validationConfigEqual(existing, config)) {
        return prev;
      }
      return { ...prev, [path]: config };
    });
  };

  const validate = (
    path: string,
    config: ValidationConfig,
  ): ValidationResult => {
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
      customFunctions: customFunctions(),
    });

    const newFieldState: FieldValidationState = {
      touched: fieldStatesRef[path]?.touched ?? true,
      validated: true,
      result,
    };
    fieldStatesRef = {
      ...fieldStatesRef,
      [path]: newFieldState,
    };
    setFieldStates(fieldStatesRef);

    return result;
  };

  const touch = (path: string) => {
    fieldStatesRef = {
      ...fieldStatesRef,
      [path]: {
        ...fieldStatesRef[path],
        touched: true,
        validated: fieldStatesRef[path]?.validated ?? false,
        result: fieldStatesRef[path]?.result ?? null,
      },
    };
    setFieldStates(fieldStatesRef);
  };

  const clear = (path: string) => {
    const { [path]: _, ...rest } = fieldStatesRef;
    fieldStatesRef = rest;
    setFieldStates(rest);
  };

  const validateAll = () => {
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
    get customFunctions() {
      return customFunctions();
    },
    get fieldStates() {
      fieldStates();
      return fieldStatesRef;
    },
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

export function useValidation(): ValidationContextValue {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}

export function useOptionalValidation(): ValidationContextValue | null {
  return useContext(ValidationContext);
}

export function useFieldValidation(
  path: string,
  config?: ValidationConfig,
): {
  state: Accessor<FieldValidationState>;
  validate: () => ValidationResult;
  touch: () => void;
  clear: () => void;
  errors: Accessor<string[]>;
  isValid: Accessor<boolean>;
} {
  const validation = useValidation();

  createEffect(() => {
    if (path && config) {
      validation.registerField(path, config);
    }
  });

  const state = createMemo<FieldValidationState>(() => {
    const current = validation.fieldStates[path];
    return (
      current ?? {
        touched: false,
        validated: false,
        result: null,
      }
    );
  });

  const validate = () => validation.validate(path, config ?? { checks: [] });
  const touch = () => validation.touch(path);
  const clear = () => validation.clear(path);
  const errors = createMemo(() => state().result?.errors ?? []);
  const isValid = createMemo(() => state().result?.valid ?? true);

  return {
    state,
    validate,
    touch,
    clear,
    errors,
    isValid,
  };
}

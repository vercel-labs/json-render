import {
  computed,
  defineComponent,
  inject,
  onMounted,
  onUnmounted,
  provide,
  ref,
  type ComputedRef,
  type PropType,
} from "vue";
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
  touched: boolean;
  validated: boolean;
  result: ValidationResult | null;
}

/**
 * Validation context value
 */
export interface ValidationContextValue {
  customFunctions: Record<string, ValidationFunction>;
  fieldStates: Record<string, FieldValidationState>;
  validate: (path: string, config: ValidationConfig) => ValidationResult;
  touch: (path: string) => void;
  clear: (path: string) => void;
  validateAll: () => boolean;
  registerField: (path: string, config: ValidationConfig) => void;
}

const VALIDATION_KEY = Symbol("json-render:validation");

export interface ValidationProviderProps {
  customFunctions?: Record<string, ValidationFunction>;
}

/**
 * Compare two args records shallowly.
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
export const ValidationProvider = defineComponent({
  name: "ValidationProvider",
  props: {
    customFunctions: {
      type: Object as PropType<Record<string, ValidationFunction>>,
      default: () => ({}),
    },
  },
  setup(props, { slots }) {
    const { state } = useStateStore();

    const fieldStates = ref<Record<string, FieldValidationState>>({});
    const fieldConfigs = ref<Record<string, ValidationConfig>>({});

    const registerField = (path: string, config: ValidationConfig) => {
      const existing = fieldConfigs.value[path];
      if (existing && validationConfigEqual(existing, config)) return;
      fieldConfigs.value = { ...fieldConfigs.value, [path]: config };
    };

    const validate = (
      path: string,
      config: ValidationConfig,
    ): ValidationResult => {
      const currentState = state.value;
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
        customFunctions: props.customFunctions,
      });

      fieldStates.value = {
        ...fieldStates.value,
        [path]: {
          touched: fieldStates.value[path]?.touched ?? true,
          validated: true,
          result,
        },
      };

      return result;
    };

    const touch = (path: string) => {
      fieldStates.value = {
        ...fieldStates.value,
        [path]: {
          ...fieldStates.value[path],
          touched: true,
          validated: fieldStates.value[path]?.validated ?? false,
          result: fieldStates.value[path]?.result ?? null,
        },
      };
    };

    const clear = (path: string) => {
      const { [path]: _, ...rest } = fieldStates.value;
      fieldStates.value = rest;
    };

    const validateAll = (): boolean => {
      let allValid = true;
      for (const [path, config] of Object.entries(fieldConfigs.value)) {
        const result = validate(path, config);
        if (!result.valid) {
          allValid = false;
        }
      }
      return allValid;
    };

    provide<ValidationContextValue>(VALIDATION_KEY, {
      get customFunctions() {
        return props.customFunctions;
      },
      get fieldStates() {
        return fieldStates.value;
      },
      validate,
      touch,
      clear,
      validateAll,
      registerField,
    });

    return () => slots.default?.();
  },
});

/**
 * Composable to access validation context (or null if not inside a ValidationProvider).
 * Useful for components that optionally participate in form validation.
 */
export function useOptionalValidation(): ValidationContextValue | null {
  return (
    inject<ValidationContextValue>(
      VALIDATION_KEY,
      null as unknown as ValidationContextValue,
    ) ?? null
  );
}

/**
 * Composable to access validation context
 */
export function useValidation(): ValidationContextValue {
  const ctx = inject<ValidationContextValue>(VALIDATION_KEY);
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}

/**
 * Composable to get validation state for a field
 */
export function useFieldValidation(
  path: string,
  config?: ValidationConfig,
): {
  state: ComputedRef<FieldValidationState>;
  validate: () => ValidationResult;
  touch: () => void;
  clear: () => void;
  errors: ComputedRef<string[]>;
  isValid: ComputedRef<boolean>;
} {
  const ctx = useValidation();

  onMounted(() => {
    if (path && config) {
      ctx.registerField(path, config);
    }
  });

  onUnmounted(() => {
    ctx.clear(path);
  });

  const defaultState: FieldValidationState = {
    touched: false,
    validated: false,
    result: null,
  };

  return {
    state: computed(() => ctx.fieldStates[path] ?? defaultState),
    validate: () => ctx.validate(path, config ?? { checks: [] }),
    touch: () => ctx.touch(path),
    clear: () => ctx.clear(path),
    errors: computed(() => ctx.fieldStates[path]?.result?.errors ?? []),
    isValid: computed(() => ctx.fieldStates[path]?.result?.valid ?? true),
  };
}

import {
  Component,
  Injectable,
  InjectionToken,
  Input,
  Signal,
  computed,
  inject,
  signal,
} from "@angular/core";
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
  customFunctions: Signal<Record<string, ValidationFunction>>;
  fieldStates: Signal<Record<string, FieldValidationState>>;
  validate: (path: string, config: ValidationConfig) => ValidationResult;
  touch: (path: string) => void;
  clear: (path: string) => void;
  validateAll: () => boolean;
  registerField: (path: string, config: ValidationConfig) => void;
}

export interface ValidationProviderProps {
  customFunctions?: Record<string, ValidationFunction>;
}

export const VALIDATION_CONTEXT = new InjectionToken<ValidationContextValue>(
  "json-render:validation",
);

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

@Injectable()
class ValidationContextService implements ValidationContextValue {
  private readonly state = useStateStore();
  readonly customFunctions = signal<Record<string, ValidationFunction>>({});
  readonly fieldStates = signal<Record<string, FieldValidationState>>({});
  private readonly fieldConfigs = signal<Record<string, ValidationConfig>>({});

  configure({ customFunctions }: ValidationProviderProps = {}): void {
    this.customFunctions.set(customFunctions ?? {});
  }

  registerField(path: string, config: ValidationConfig): void {
    const existing = this.fieldConfigs()[path];
    if (existing && validationConfigEqual(existing, config)) return;
    this.fieldConfigs.update((value) => ({ ...value, [path]: config }));
  }

  validate(path: string, config: ValidationConfig): ValidationResult {
    const result = runValidation(config, {
      value: this.state.get(path),
      stateModel: this.state.state(),
      customFunctions: this.customFunctions(),
    });

    this.fieldStates.update((value) => ({
      ...value,
      [path]: {
        touched: value[path]?.touched ?? true,
        validated: true,
        result,
      },
    }));

    return result;
  }

  touch(path: string): void {
    this.fieldStates.update((value) => ({
      ...value,
      [path]: {
        ...value[path],
        touched: true,
        validated: value[path]?.validated ?? false,
        result: value[path]?.result ?? null,
      },
    }));
  }

  clear(path: string): void {
    this.fieldStates.update((value) => {
      const { [path]: _removed, ...rest } = value;
      return rest;
    });
  }

  validateAll(): boolean {
    let allValid = true;
    for (const [path, config] of Object.entries(this.fieldConfigs())) {
      const result = this.validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }
    return allValid;
  }
}

@Component({
  selector: "json-render-validation-provider",
  standalone: true,
  template: `<ng-content />`,
  providers: [
    ValidationContextService,
    {
      provide: VALIDATION_CONTEXT,
      useExisting: ValidationContextService,
    },
  ],
})
export class ValidationProvider {
  private readonly ctx = inject(ValidationContextService);

  @Input() customFunctions?: Record<string, ValidationFunction>;

  ngOnInit(): void {
    this.ctx.configure({ customFunctions: this.customFunctions });
  }

  ngOnChanges(): void {
    this.ctx.configure({ customFunctions: this.customFunctions });
  }
}

export function useOptionalValidation(): ValidationContextValue | null {
  return inject(VALIDATION_CONTEXT, { optional: true }) ?? null;
}

export function useValidation(): ValidationContextValue {
  const ctx = useOptionalValidation();
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}

export function useFieldValidation(
  path: string,
  config?: ValidationConfig,
): {
  state: Signal<FieldValidationState>;
  validate: () => ValidationResult;
  touch: () => void;
  clear: () => void;
  errors: Signal<string[]>;
  isValid: Signal<boolean>;
} {
  const ctx = useValidation();
  if (config) {
    ctx.registerField(path, config);
  }

  const defaultState: FieldValidationState = {
    touched: false,
    validated: false,
    result: null,
  };

  return {
    state: computed(() => ctx.fieldStates()[path] ?? defaultState),
    validate: () => ctx.validate(path, config ?? { checks: [] }),
    touch: () => ctx.touch(path),
    clear: () => ctx.clear(path),
    errors: computed(() => ctx.fieldStates()[path]?.result?.errors ?? []),
    isValid: computed(() => ctx.fieldStates()[path]?.result?.valid ?? true),
  };
}

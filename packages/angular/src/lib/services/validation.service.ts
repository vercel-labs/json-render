import { Injectable, inject, signal } from "@angular/core";
import { runValidation } from "@json-render/core";
import type {
  ValidationConfig,
  ValidationFunction,
  ValidationResult,
} from "@json-render/core";

import { SpecStateService } from "./spec-state.service";

export interface FieldValidationState {
  touched: boolean;
  validated: boolean;
  result: ValidationResult | null;
}

/**
 * Per-field validation store. Fields register their `checks` when rendered and
 * unregister when hidden/destroyed. `validateAll()` runs every registered field
 * synchronously (used by the built-in `validateForm` action).
 */
@Injectable()
export class ValidationService {
  private readonly stateService = inject(SpecStateService);
  private customFunctions: Record<string, ValidationFunction> = {};
  private fieldConfigs: Record<string, ValidationConfig> = {};

  readonly fieldStates = signal<Record<string, FieldValidationState>>({});

  setCustomFunctions(fns: Record<string, ValidationFunction>): void {
    this.customFunctions = fns;
  }

  registerField(path: string, config: ValidationConfig): void {
    this.fieldConfigs[path] = config;
  }

  unregisterField(path: string): void {
    const { [path]: _removed, ...restConfigs } = this.fieldConfigs;
    this.fieldConfigs = restConfigs;
    this.fieldStates.update((prev) => {
      const { [path]: _state, ...rest } = prev;
      return rest;
    });
  }

  validate(path: string, config: ValidationConfig): ValidationResult {
    const currentState = this.stateService.state();
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
      customFunctions: this.customFunctions,
    });

    this.fieldStates.update((prev) => ({
      ...prev,
      [path]: {
        touched: prev[path]?.touched ?? true,
        validated: true,
        result,
      },
    }));

    return result;
  }

  touch(path: string): void {
    this.fieldStates.update((prev) => ({
      ...prev,
      [path]: {
        ...prev[path],
        touched: true,
        validated: prev[path]?.validated ?? false,
        result: prev[path]?.result ?? null,
      },
    }));
  }

  clear(path: string): void {
    this.fieldStates.update((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
  }

  /** Validate every registered field. Returns true when all pass. */
  validateAll(): boolean {
    let allValid = true;
    for (const [path, config] of Object.entries(this.fieldConfigs)) {
      const result = this.validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }
    return allValid;
  }

  /** Collect the errors of all currently-invalid fields, keyed by path. */
  collectErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const [path, fs] of Object.entries(this.fieldStates())) {
      if (fs.result && !fs.result.valid) {
        errors[path] = fs.result.errors;
      }
    }
    return errors;
  }
}

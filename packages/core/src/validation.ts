import { z } from 'zod';
import type { DynamicValue, DataModel, LogicExpression } from './types';
import { DynamicValueSchema, resolveDynamicValue } from './types';
import { LogicExpressionSchema, evaluateLogicExpression } from './visibility';

/**
 * Validation check definition
 */
export interface ValidationCheck {
  /** Function name (built-in or from catalog) */
  fn: string;
  /** Additional arguments for the function */
  args?: Record<string, DynamicValue>;
  /** Error message to display if check fails */
  message: string;
}

/**
 * Validation configuration for a field
 */
export interface ValidationConfig {
  /** Array of checks to run */
  checks?: ValidationCheck[];
  /** When to run validation */
  validateOn?: 'change' | 'blur' | 'submit';
  /** Condition for when validation is enabled */
  enabled?: LogicExpression;
}

/**
 * Schema for validation check
 */
export const ValidationCheckSchema = z.object({
  fn: z.string(),
  args: z.record(z.string(), DynamicValueSchema).optional(),
  message: z.string(),
});

/**
 * Schema for validation config
 */
export const ValidationConfigSchema = z.object({
  checks: z.array(ValidationCheckSchema).optional(),
  validateOn: z.enum(['change', 'blur', 'submit']).optional(),
  enabled: LogicExpressionSchema.optional(),
});

/**
 * Validation function signature
 */
export type ValidationFunction = (
  value: unknown,
  args?: Record<string, unknown>
) => boolean;

/**
 * Validation function definition in catalog
 */
export interface ValidationFunctionDefinition {
  /** The validation function */
  validate: ValidationFunction;
  /** Description for AI */
  description?: string;
}

/**
 * Built-in validation functions
 */
export const builtInValidationFunctions: Record<string, ValidationFunction> = {
  /**
   * Check if value is not null, undefined, or empty string
   */
  required: (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  /**
   * Check if value is a valid email address
   */
  email: (value: unknown) => {
    if (typeof value !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  /**
   * Check minimum string length
   */
  minLength: (value: unknown, args?: Record<string, unknown>) => {
    if (typeof value !== 'string') return false;
    const min = args?.min;
    if (min === undefined) {
      console.warn('minLength validation requires a min argument');
      return false;
    }
    if (typeof min !== 'number') return false;
    return value.length >= min;
  },

  /**
   * Check maximum string length
   */
  maxLength: (value: unknown, args?: Record<string, unknown>) => {
    if (typeof value !== 'string') return false;
    const max = args?.max;
    if (max === undefined) {
      console.warn('maxLength validation requires a max argument');
      return false;
    }
    if (typeof max !== 'number') return false;
    return value.length <= max;
  },

  /**
   * Check if string matches a regex pattern
   */
  pattern: (value: unknown, args?: Record<string, unknown>) => {
    if (typeof value !== 'string') return false;
    const pattern = args?.pattern;
    if (pattern === undefined) {
      console.warn('pattern validation requires a pattern argument');
      return false;
    }
    if (typeof pattern !== 'string') return false;
    try {
      return new RegExp(pattern).test(value);
    } catch {
      return false;
    }
  },

  /**
   * Check minimum numeric value
   */
  min: (value: unknown, args?: Record<string, unknown>) => {
    if (typeof value !== 'number') return false;
    const min = args?.min;
    if (min === undefined) {
      console.warn('min validation requires a min argument');
      return false;
    }
    if (typeof min !== 'number') return false;
    return value >= min;
  },

  /**
   * Check maximum numeric value
   */
  max: (value: unknown, args?: Record<string, unknown>) => {
    if (typeof value !== 'number') return false;
    const max = args?.max;
    if (max === undefined) {
      console.warn('max validation requires a max argument');
      return false;
    }
    if (typeof max !== 'number') return false;
    return value <= max;
  },

  /**
   * Check if value is a number
   */
  numeric: (value: unknown) => {
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'string') return !isNaN(parseFloat(value));
    return false;
  },

  /**
   * Check if value is a valid URL
   */
  url: (value: unknown) => {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if value matches another field
   */
  matches: (value: unknown, args?: Record<string, unknown>) => {
    const other = args?.other;
    if (other === undefined) {
      console.warn('matches validation requires a value argument');
      return false;
    }
    return value === other;
  },
};

/**
 * Validation result for a single check
 */
export interface ValidationCheckResult {
  fn: string;
  valid: boolean;
  message: string;
}

/**
 * Full validation result for a field
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  checks: ValidationCheckResult[];
}

/**
 * Context for running validation
 */
export interface ValidationContext {
  /** Current value to validate */
  value: unknown;
  /** Full data model for resolving paths */
  dataModel: DataModel;
  /** Custom validation functions from catalog */
  customFunctions?: Record<string, ValidationFunction>;
}

/**
 * Run a single validation check
 */
export function runValidationCheck(
  check: ValidationCheck,
  ctx: ValidationContext
): ValidationCheckResult {
  const { value, dataModel, customFunctions } = ctx;

  // Resolve args
  const resolvedArgs: Record<string, unknown> = {};
  if (check.args) {
    for (const [key, argValue] of Object.entries(check.args)) {
      resolvedArgs[key] = resolveDynamicValue(argValue, dataModel);
    }
  }

  // Find the validation function
  const fn =
    builtInValidationFunctions[check.fn] ?? customFunctions?.[check.fn];

  if (!fn) {
    console.warn(`Unknown validation function: ${check.fn}`);
    return {
      fn: check.fn,
      valid: true, // Don't fail on unknown functions
      message: check.message,
    };
  }

  const valid = fn(value, resolvedArgs);

  return {
    fn: check.fn,
    valid,
    message: check.message,
  };
}

/**
 * Run all validation checks for a field
 */
export function runValidation(
  config: ValidationConfig,
  ctx: ValidationContext & { authState?: { isSignedIn: boolean } }
): ValidationResult {
  const checks: ValidationCheckResult[] = [];
  const errors: string[] = [];

  // Check if validation is enabled
  if (config.enabled) {
    const enabled = evaluateLogicExpression(config.enabled, {
      dataModel: ctx.dataModel,
      authState: ctx.authState,
    });
    if (!enabled) {
      return { valid: true, errors: [], checks: [] };
    }
  }

  // Run each check
  if (config.checks) {
    for (const check of config.checks) {
      const result = runValidationCheck(check, ctx);
      checks.push(result);
      if (!result.valid) {
        errors.push(result.message);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    checks,
  };
}

/**
 * Helper to create validation checks
 */
export const check = {
  required: (message = 'This field is required'): ValidationCheck => ({
    fn: 'required',
    message,
  }),

  email: (message = 'Invalid email address'): ValidationCheck => ({
    fn: 'email',
    message,
  }),

  minLength: (min: number, message?: string): ValidationCheck => ({
    fn: 'minLength',
    args: { min },
    message: message ?? `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationCheck => ({
    fn: 'maxLength',
    args: { max },
    message: message ?? `Must be at most ${max} characters`,
  }),

  pattern: (pattern: string, message = 'Invalid format'): ValidationCheck => ({
    fn: 'pattern',
    args: { pattern },
    message,
  }),

  min: (min: number, message?: string): ValidationCheck => ({
    fn: 'min',
    args: { min },
    message: message ?? `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationCheck => ({
    fn: 'max',
    args: { max },
    message: message ?? `Must be at most ${max}`,
  }),

  url: (message = 'Invalid URL'): ValidationCheck => ({
    fn: 'url',
    message,
  }),

  matches: (
    otherPath: string,
    message = 'Fields must match'
  ): ValidationCheck => ({
    fn: 'matches',
    args: { other: { path: otherPath } },
    message,
  }),
};

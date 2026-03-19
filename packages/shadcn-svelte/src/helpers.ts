import { getOptionalValidationContext } from "@json-render/svelte";

type ValidateOn = "change" | "blur" | "submit";

type ValidationCheck = {
  type: string;
  message: string;
  args?: Record<string, unknown>;
};

export type ValidationCtx = ReturnType<typeof getOptionalValidationContext>;

export function getPaginationRange(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function createValidation(
  validation: ValidationCtx,
  path?: string,
  checks?: ValidationCheck[] | null,
) {
  const config = checks && checks.length > 0 ? { checks } : null;

  function register(validateOn: ValidateOn) {
    if (!validation || !path || !config) return;
    validation.registerField(path, {
      checks: config.checks,
      validateOn,
    });
  }

  function run(validateOn: ValidateOn): string[] {
    if (!validation || !path || !config) return [];
    const result = validation.validate(path, {
      checks: config.checks,
      validateOn,
    });
    return result.errors;
  }

  return {
    hasValidation: !!(validation && path && config),
    register,
    run,
  };
}

import type { Spec, UIElement } from "./types";

// =============================================================================
// Spec Structural Validation
// =============================================================================

/**
 * Severity level for validation issues.
 */
export type SpecIssueSeverity = "error" | "warning";

/**
 * A single validation issue found in a spec.
 */
export interface SpecIssue {
  /** Severity: errors should be fixed, warnings are informational */
  severity: SpecIssueSeverity;
  /** Human-readable description of the issue */
  message: string;
  /** The element key where the issue was found (if applicable) */
  elementKey?: string;
  /** Machine-readable issue code for programmatic handling */
  code:
    | "missing_root"
    | "root_not_found"
    | "missing_child"
    | "visible_in_props"
    | "orphaned_element"
    | "empty_spec"
    | "on_in_props"
    | "repeat_in_props"
    | "watch_in_props";
}

/**
 * Result of spec structural validation.
 */
export interface SpecValidationIssues {
  /** Whether the spec passed validation (no errors; warnings are OK) */
  valid: boolean;
  /** List of issues found */
  issues: SpecIssue[];
}

/**
 * Options for validateSpec.
 */
export interface ValidateSpecOptions {
  /**
   * Whether to check for orphaned elements (elements not reachable from root).
   * Defaults to false since orphans are harmless (just unused).
   */
  checkOrphans?: boolean;
}

/**
 * Validate a spec for structural integrity.
 *
 * Checks for common AI-generation errors:
 * - Missing or empty root
 * - Root element not found in elements map
 * - Children referencing non-existent elements
 * - `visible` placed inside `props` instead of on the element
 * - Orphaned elements (optional)
 *
 * @example
 * ```ts
 * const result = validateSpec(spec);
 * if (!result.valid) {
 *   console.log("Spec errors:", result.issues);
 * }
 * ```
 */
export function validateSpec(
  spec: Spec,
  options: ValidateSpecOptions = {},
): SpecValidationIssues {
  const { checkOrphans = false } = options;
  const issues: SpecIssue[] = [];

  // 1. Check root
  if (!spec.root) {
    issues.push({
      severity: "error",
      message: "Spec has no root element defined.",
      code: "missing_root",
    });
    return { valid: false, issues };
  }

  if (!spec.elements[spec.root]) {
    issues.push({
      severity: "error",
      message: `Root element "${spec.root}" not found in elements map.`,
      code: "root_not_found",
    });
  }

  // 2. Check for empty spec
  if (Object.keys(spec.elements).length === 0) {
    issues.push({
      severity: "error",
      message: "Spec has no elements.",
      code: "empty_spec",
    });
    return { valid: false, issues };
  }

  // 3. Check each element
  for (const [key, element] of Object.entries(spec.elements)) {
    // 3a. Missing children
    if (element.children) {
      for (const childKey of element.children) {
        if (!spec.elements[childKey]) {
          issues.push({
            severity: "error",
            message: `Element "${key}" references child "${childKey}" which does not exist in the elements map.`,
            elementKey: key,
            code: "missing_child",
          });
        }
      }
    }

    // 3b. `visible` inside props
    const props = element.props as Record<string, unknown> | undefined;
    if (props && "visible" in props && props.visible !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "visible" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
        elementKey: key,
        code: "visible_in_props",
      });
    }

    // 3c. `on` inside props (should be a top-level field)
    if (props && "on" in props && props.on !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "on" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
        elementKey: key,
        code: "on_in_props",
      });
    }

    // 3d. `repeat` inside props (should be a top-level field)
    if (props && "repeat" in props && props.repeat !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "repeat" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
        elementKey: key,
        code: "repeat_in_props",
      });
    }

    // 3e. `watch` inside props (should be a top-level field)
    if (props && "watch" in props && props.watch !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "watch" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
        elementKey: key,
        code: "watch_in_props",
      });
    }
  }

  // 4. Orphaned elements (optional)
  if (checkOrphans) {
    const reachable = new Set<string>();
    const walk = (key: string) => {
      if (reachable.has(key)) return;
      reachable.add(key);
      const el = spec.elements[key];
      if (el?.children) {
        for (const childKey of el.children) {
          if (spec.elements[childKey]) {
            walk(childKey);
          }
        }
      }
    };
    if (spec.elements[spec.root]) {
      walk(spec.root);
    }

    for (const key of Object.keys(spec.elements)) {
      if (!reachable.has(key)) {
        issues.push({
          severity: "warning",
          message: `Element "${key}" is not reachable from root "${spec.root}".`,
          elementKey: key,
          code: "orphaned_element",
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return { valid: !hasErrors, issues };
}

/**
 * Auto-fix common spec issues in-place and return a corrected copy.
 *
 * Currently fixes:
 * - `visible` inside `props` → moved to element level
 * - `on` inside `props` → moved to element level
 * - `repeat` inside `props` → moved to element level
 *
 * Returns the fixed spec and a list of fixes applied.
 */
export function autoFixSpec(spec: Spec): {
  spec: Spec;
  fixes: string[];
} {
  const fixes: string[] = [];
  const fixedElements: Record<string, UIElement> = {};

  for (const [key, element] of Object.entries(spec.elements)) {
    const props = element.props as Record<string, unknown> | undefined;
    let fixed = element;

    if (props && "visible" in props && props.visible !== undefined) {
      // Move visible from props to element level
      const { visible, ...restProps } = fixed.props as Record<string, unknown>;
      fixed = {
        ...fixed,
        props: restProps,
        visible: visible as UIElement["visible"],
      };
      fixes.push(`Moved "visible" from props to element level on "${key}".`);
    }

    let currentProps = fixed.props as Record<string, unknown> | undefined;
    if (currentProps && "on" in currentProps && currentProps.on !== undefined) {
      // Move on from props to element level
      const { on, ...restProps } = currentProps;
      fixed = {
        ...fixed,
        props: restProps,
        on: on as UIElement["on"],
      };
      fixes.push(`Moved "on" from props to element level on "${key}".`);
    }

    currentProps = fixed.props as Record<string, unknown> | undefined;
    if (
      currentProps &&
      "repeat" in currentProps &&
      currentProps.repeat !== undefined
    ) {
      // Move repeat from props to element level
      const { repeat, ...restProps } = currentProps;
      fixed = {
        ...fixed,
        props: restProps,
        repeat: repeat as UIElement["repeat"],
      };
      fixes.push(`Moved "repeat" from props to element level on "${key}".`);
    }

    currentProps = fixed.props as Record<string, unknown> | undefined;
    if (
      currentProps &&
      "watch" in currentProps &&
      currentProps.watch !== undefined
    ) {
      const { watch, ...restProps } = currentProps;
      fixed = {
        ...fixed,
        props: restProps,
        watch: watch as UIElement["watch"],
      };
      fixes.push(`Moved "watch" from props to element level on "${key}".`);
    }

    fixedElements[key] = fixed;
  }

  return {
    spec: { root: spec.root, elements: fixedElements, state: spec.state },
    fixes,
  };
}

/**
 * Format validation issues into a human-readable string suitable for
 * inclusion in a repair prompt sent back to the AI.
 */
export function formatSpecIssues(issues: SpecIssue[]): string {
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length === 0) return "";

  const lines = ["The generated UI spec has the following errors:"];
  for (const issue of errors) {
    lines.push(`- ${issue.message}`);
  }
  return lines.join("\n");
}

import type { Spec, UIElement } from "./types";
import {
  getByPath,
  resolveRepeatItemStatePath,
  resolveRepeatStatePath,
} from "./types";
import { VisibilityConditionStrictSchema } from "./visibility";

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
    | "invalid_visible"
    | "repeat_without_children"
    | "repeat_item_outside_scope"
    | "repeat_state_mismatch"
    | "visible_in_props"
    | "orphaned_element"
    | "empty_spec"
    | "on_in_props"
    | "repeat_in_props"
    | "watch_in_props"
    | "action_in_props"
    | "actionParams_in_props"
    | "children_in_props"
    | "state_in_props";
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
    if (element.slots) {
      for (const [slotName, childKeys] of Object.entries(element.slots)) {
        for (const childKey of childKeys) {
          if (!spec.elements[childKey]) {
            issues.push({
              severity: "error",
              message: `Element "${key}" references child "${childKey}" in slot "${slotName}" which does not exist in the elements map.`,
              elementKey: key,
              code: "missing_child",
            });
          }
        }
      }
    }

    // 3b. Repeat containers that can never render anything. Both shapes pass
    // schema validation but produce silently empty regions at runtime.
    if (element.repeat !== undefined) {
      if (!element.children || element.children.length === 0) {
        issues.push({
          severity: "error",
          message: `Element "${key}" has "repeat" but no children. The repeated template must be a child element: add a child that renders one item (it may read fields with {"$item": "field"}).`,
          elementKey: key,
          code: "repeat_without_children",
        });
      }
    }

    // 3b. Malformed visible condition. Unrecognized shapes silently evaluate
    // to hidden at runtime, so catch them here with a repairable message.
    if (
      element.visible !== undefined &&
      !VisibilityConditionStrictSchema.safeParse(element.visible).success
    ) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has an invalid "visible" condition: ${JSON.stringify(element.visible)}. Valid forms: true, false, {"$state":"/path","eq":value}, {"$item":"field","eq":value}, {"$index":true,"eq":n}, an array of those (AND), or {"$and":[...]} / {"$or":[...]}. Use exactly one of $state, $item, or $index per condition object.`,
        elementKey: key,
        code: "invalid_visible",
      });
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

    // 3f. `action` inside props (legacy pattern, should use `on` field)
    if (props && "action" in props && props.action !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "action" inside "props". Use the "on" field instead: { "on": { "press": { "action": "...", "params": {...} } } }`,
        elementKey: key,
        code: "action_in_props",
      });
    }

    // 3g. `actionParams` inside props (legacy pattern, should use `on` field)
    if (props && "actionParams" in props && props.actionParams !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "actionParams" inside "props". Use the "on" field instead: { "on": { "press": { "action": "...", "params": {...} } } }`,
        elementKey: key,
        code: "actionParams_in_props",
      });
    }

    // 3h. `children` inside props (should be a top-level field)
    if (props && "children" in props && props.children !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "children" inside "props". It should be a top-level field on the element (sibling of type/props).`,
        elementKey: key,
        code: "children_in_props",
      });
    }

    // 3i. `state` inside props (should be at spec level or use $state/$bindState)
    if (props && "state" in props && props.state !== undefined) {
      issues.push({
        severity: "error",
        message: `Element "${key}" has "state" inside "props". State should be defined at spec.state level, not inside element props. Use { "$state": "/path" } or { "$bindState": "/path" } for state references.`,
        elementKey: key,
        code: "state_in_props",
      });
    }
  }

  const repeatValidatedKeys = new Set<string>();
  const repeatValidatedContexts = new Set<string>();
  const validateRepeatPaths = (
    key: string,
    repeatBasePath: string | undefined,
    sampleAvailable: boolean,
    ancestors: Set<string>,
  ) => {
    if (ancestors.has(key)) return;
    const element = spec.elements[key];
    if (!element) return;
    repeatValidatedKeys.add(key);
    const contextKey = `${key}\u0000${repeatBasePath ?? ""}\u0000${sampleAvailable}`;
    if (repeatValidatedContexts.has(contextKey)) return;
    repeatValidatedContexts.add(contextKey);

    let childRepeatBasePath = repeatBasePath;
    let childSampleAvailable = sampleAvailable;

    if (element.repeat !== undefined) {
      const statePath = resolveRepeatStatePath(
        element.repeat.statePath,
        repeatBasePath,
      );
      const displayPath =
        typeof element.repeat.statePath === "string"
          ? element.repeat.statePath
          : JSON.stringify(element.repeat.statePath);

      if (statePath === undefined) {
        issues.push({
          severity: "error",
          message: `Element "${key}" uses relative repeat statePath ${displayPath} outside a repeat scope.`,
          elementKey: key,
          code: "repeat_item_outside_scope",
        });
        childRepeatBasePath = undefined;
        childSampleAvailable = false;
      } else {
        const canCheckSample =
          spec.state !== undefined &&
          (typeof element.repeat.statePath === "string" || sampleAvailable);
        const value = canCheckSample
          ? getByPath(spec.state, statePath)
          : undefined;

        if (canCheckSample && !Array.isArray(value)) {
          issues.push({
            severity: "error",
            message: `Element "${key}" repeats over "${statePath}" but state${value === undefined ? " has no value there" : ` has a ${typeof value} there`}. Repeat statePath must reference an array in state; add sample items to state at that path.`,
            elementKey: key,
            code: "repeat_state_mismatch",
          });
        }

        childRepeatBasePath = resolveRepeatItemStatePath(statePath, 0);
        childSampleAvailable =
          canCheckSample && Array.isArray(value) && value.length > 0;
      }
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(key);
    for (const childKey of element.children ?? []) {
      validateRepeatPaths(
        childKey,
        childRepeatBasePath,
        childSampleAvailable,
        nextAncestors,
      );
    }
    for (const childKeys of Object.values(element.slots ?? {})) {
      for (const childKey of childKeys) {
        validateRepeatPaths(
          childKey,
          repeatBasePath,
          sampleAvailable,
          nextAncestors,
        );
      }
    }
  };

  if (spec.elements[spec.root]) {
    validateRepeatPaths(spec.root, undefined, true, new Set());
  }
  for (const key of Object.keys(spec.elements)) {
    if (!repeatValidatedKeys.has(key)) {
      validateRepeatPaths(key, undefined, true, new Set());
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
      if (el?.slots) {
        for (const childKeys of Object.values(el.slots)) {
          for (const childKey of childKeys) {
            if (spec.elements[childKey]) {
              walk(childKey);
            }
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
export interface SpecFix {
  message: string;
  /**
   * Lossy fixes change what renders (e.g. pruning a dangling child
   * reference); lossless fixes only relocate misplaced fields. Callers with a
   * repair loop should prefer re-prompting over accepting lossy fixes, and
   * use the lossy-fixed spec as a last resort.
   */
  lossy: boolean;
}

export interface AutoFixOptions {
  /**
   * Apply lossy fixes (content pruning). Default true. Callers with a repair
   * loop should pass false while retries remain so the model regenerates the
   * missing content, then true as a last resort.
   */
  lossy?: boolean;
}

export function autoFixSpec(
  spec: Spec,
  options: AutoFixOptions = {},
): {
  spec: Spec;
  fixes: string[];
  /** Structured fix records; fixes is the plain-message projection. */
  fixDetails: SpecFix[];
} {
  const applyLossy = options.lossy !== false;
  const fixDetails: SpecFix[] = [];
  const fixes = {
    push(message: string, lossy = false) {
      fixDetails.push({ message, lossy });
    },
  };
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

    // Fix children inside props → move to element level
    currentProps = fixed.props as Record<string, unknown> | undefined;
    if (
      currentProps &&
      "children" in currentProps &&
      currentProps.children !== undefined
    ) {
      const { children, ...restProps } = currentProps;
      // Only move if it's an array of strings (element keys)
      if (
        Array.isArray(children) &&
        children.every((c) => typeof c === "string")
      ) {
        fixed = {
          ...fixed,
          props: restProps,
          children: children as string[],
        };
        fixes.push(`Moved "children" from props to element level on "${key}".`);
      }
    }

    // Fix legacy action/actionParams → convert to on.press
    currentProps = fixed.props as Record<string, unknown> | undefined;
    if (
      currentProps &&
      "action" in currentProps &&
      currentProps.action !== undefined
    ) {
      const { action, actionParams, ...restProps } = currentProps;
      const actionBinding = {
        action: action as string,
        ...(actionParams ? { params: actionParams as Record<string, unknown> } : {}),
      };
      fixed = {
        ...fixed,
        props: restProps,
        on: {
          ...(fixed.on ?? {}),
          press: actionBinding,
        },
      };
      fixes.push(
        `Converted legacy "action"/"actionParams" to "on.press" on "${key}".`,
      );
    }

    fixedElements[key] = fixed;
  }

  // Drop references to elements that were never defined. The renderer skips
  // missing children at runtime, so pruning produces the same rendered output
  // while letting the spec pass validation instead of hard-failing.
  if (applyLossy)
    for (const [key, element] of Object.entries(fixedElements)) {
      if (!element.children || element.children.length === 0) continue;
      const present = element.children.filter(
        (child) => child in fixedElements,
      );
      if (present.length === element.children.length) continue;
      if (element.repeat !== undefined && present.length === 0) {
        // Pruning every child of a repeat container would only trade the
        // missing_child error for repeat_without_children; keep the dangling
        // reference so repair targets the real problem (the missing template).
        continue;
      }
      for (const child of element.children) {
        if (!(child in fixedElements)) {
          fixes.push(
            `Removed reference to undefined element "${child}" from children of "${key}".`,
            true,
          );
        }
      }
      fixedElements[key] = { ...element, children: present };
    }

  if (applyLossy)
    for (const [key, element] of Object.entries(fixedElements)) {
      if (!element.slots) continue;
      let changed = false;
      const slots = Object.fromEntries(
        Object.entries(element.slots).map(([slotName, childKeys]) => {
          const present = childKeys.filter((child) => child in fixedElements);
          if (present.length !== childKeys.length) {
            changed = true;
            for (const child of childKeys) {
              if (!(child in fixedElements)) {
                fixes.push(
                  `Removed reference to undefined element "${child}" from slot "${slotName}" of "${key}".`,
                  true,
                );
              }
            }
          }
          return [slotName, present];
        }),
      );
      if (changed) {
        fixedElements[key] = { ...element, slots };
      }
    }

  return {
    spec: { root: spec.root, elements: fixedElements, state: spec.state },
    fixes: fixDetails.map((fix) => fix.message),
    fixDetails,
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

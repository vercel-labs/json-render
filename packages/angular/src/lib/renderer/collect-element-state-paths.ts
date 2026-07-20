import type {
  ActionBinding,
  PropResolutionContext,
  StateCondition,
  UIElement,
  VisibilityCondition,
} from "@json-render/core";

const TEMPLATE_TOKEN_RE = /\$\{(\/[^}]*|[A-Za-z0-9_]+)\}/g;

/**
 * Compute the complete set of state paths an element depends on for rendering:
 * `$state`/`$bindState` (absolute), `$item`/`$bindItem` (resolved via
 * `repeatBasePath`), `$template` tokens (absolute `${/path}` and bare
 * `${field}`), `$cond` branches, the `visible` condition (incl. nested
 * `$and`/`$or` and `{$state}` operands), the `on[].params` action refs (walked
 * recursively for nested expressions), and the `repeat.statePath`.
 *
 * Pure: reads only the element and the (repeat) context, never state values.
 */
export function collectElementStatePaths(
  element: UIElement,
  ctx: PropResolutionContext,
): Set<string> {
  const paths = new Set<string>();
  collectFromValue(element.props, ctx, paths);
  collectFromVisibility(element.visible, paths);
  collectFromHandlers(element.on, ctx, paths);
  if (element.repeat) {
    paths.add(element.repeat.statePath);
  }
  return paths;
}

function collectFromValue(
  value: unknown,
  ctx: PropResolutionContext,
  out: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectFromValue(entry, ctx, out);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (collectFromExpression(value, ctx, out)) {
    return;
  }
  for (const nested of Object.values(value)) {
    collectFromValue(nested, ctx, out);
  }
}

function collectFromExpression(
  value: Record<string, unknown>,
  ctx: PropResolutionContext,
  out: Set<string>,
): boolean {
  if (typeof value["$state"] === "string") {
    out.add(value["$state"]);
    return true;
  }
  if (typeof value["$bindState"] === "string") {
    out.add(value["$bindState"]);
    return true;
  }
  if (typeof value["$item"] === "string") {
    addItemPath(value["$item"], ctx, out);
    return true;
  }
  if (typeof value["$bindItem"] === "string") {
    addItemPath(value["$bindItem"], ctx, out);
    return true;
  }
  if (typeof value["$template"] === "string") {
    addTemplatePaths(value["$template"], ctx, out);
    return true;
  }
  if ("$cond" in value) {
    collectFromVisibility(value["$cond"] as VisibilityCondition, out);
    collectFromValue(value["$then"], ctx, out);
    collectFromValue(value["$else"], ctx, out);
    return true;
  }
  return false;
}

function addItemPath(
  itemPath: string,
  ctx: PropResolutionContext,
  out: Set<string>,
): void {
  if (ctx.repeatBasePath === undefined) {
    return;
  }
  out.add(
    itemPath === "" ? ctx.repeatBasePath : `${ctx.repeatBasePath}/${itemPath}`,
  );
}

/**
 * Extract dependency paths from a `$template` string. Absolute `${/path}`
 * tokens map straight to that path. Bare `${field}` tokens can resolve (per
 * core) either to the top-level state key `/field` OR, inside a repeat scope,
 * to `${repeatBasePath}/field` — so both candidates are added. Over-collecting
 * is safe (a superfluous dep is a harmless no-op recompute).
 */
function addTemplatePaths(
  template: string,
  ctx: PropResolutionContext,
  out: Set<string>,
): void {
  for (const match of template.matchAll(TEMPLATE_TOKEN_RE)) {
    const token = match[1];
    if (token === undefined) {
      continue;
    }
    if (token.startsWith("/")) {
      out.add(token);
      continue;
    }
    out.add(`/${token}`);
    if (ctx.repeatBasePath !== undefined) {
      out.add(`${ctx.repeatBasePath}/${token}`);
    }
  }
}

function collectFromVisibility(
  condition: VisibilityCondition | undefined,
  out: Set<string>,
): void {
  if (condition === undefined || typeof condition === "boolean") {
    return;
  }
  if (Array.isArray(condition)) {
    for (const entry of condition) {
      collectFromVisibility(entry, out);
    }
    return;
  }
  if ("$and" in condition) {
    condition.$and.forEach((c) => collectFromVisibility(c, out));
    return;
  }
  if ("$or" in condition) {
    condition.$or.forEach((c) => collectFromVisibility(c, out));
    return;
  }
  collectFromSingleCondition(condition, out);
}

function collectFromSingleCondition(
  condition: Record<string, unknown>,
  out: Set<string>,
): void {
  const path = (condition as Partial<StateCondition>).$state;
  if (typeof path === "string") {
    out.add(path);
  }
  for (const operand of Object.values(condition)) {
    if (isRecord(operand) && typeof operand["$state"] === "string") {
      out.add(operand["$state"]);
    }
  }
}

function collectFromHandlers(
  on: UIElement["on"],
  ctx: PropResolutionContext,
  out: Set<string>,
): void {
  if (!on) {
    return;
  }
  for (const binding of Object.values(on)) {
    const bindings: ActionBinding[] = Array.isArray(binding)
      ? binding
      : [binding];
    for (const b of bindings) {
      collectFromParams(b.params, ctx, out);
    }
  }
}

/**
 * Collect state paths from a single action binding's params map. Each param
 * value is walked through the same expression walker as props, so nested
 * `$cond`/`$state`/objects inside params are captured as dependencies too.
 */
function collectFromParams(
  params: ActionBinding["params"],
  ctx: PropResolutionContext,
  out: Set<string>,
): void {
  if (!params) {
    return;
  }
  for (const val of Object.values(params)) {
    collectFromValue(val, ctx, out);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

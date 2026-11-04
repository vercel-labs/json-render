import {
  evaluateVisibility,
  getByPath,
  resolveElementProps,
  resolveRepeatItemStatePath,
  resolveRepeatStatePath,
  splitRepeatVisibility,
  type PropResolutionContext,
  type Spec,
  type UIElement,
} from "@json-render/core";
import type { CardChild, CardElement } from "chat";
import * as build from "./elements";
import type { ZodType } from "zod";
import { standardComponentDefinitions } from "./catalog";

type Element = {
  type: string;
  props: Record<string, any>;
  children: string[];
};

type ComponentDefs = Record<
  string,
  { props: ZodType; slots?: readonly string[] }
>;

/**
 * Per-message limits a platform enforces. Chat SDK adapters degrade content
 * past these limits (Slack turns a second table into a code block), so
 * passing them makes toCard reject the spec instead.
 */
export interface CardLimits {
  tables?: number;
  charts?: number;
  fields?: number;
  tableRows?: number;
  tableColumns?: number;
  chartLabel?: number;
  chartTitle?: number;
  chartSeries?: number;
  chartPoints?: number;
}

export interface ToCardOptions {
  /** Component definitions. Defaults to the standard components. */
  components?: ComponentDefs;
  /** Platform limits to enforce before posting. */
  limits?: CardLimits;
  /**
   * Maximum number of elements and table rows a spec may expand to after
   * `repeat`. Expansion stops at this budget, so nested repeats cannot grow
   * without bound. Defaults to 1000, well above what a chat message can hold
   * (Slack caps a message at 50 blocks and a table at 100 rows).
   */
  maxElements?: number;
}

const DEFAULT_MAX_ELEMENTS = 1000;

export class CardSpecError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join("\n"));
    this.name = "CardSpecError";
  }
}

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

// Rows bound from state often arrive as objects. Each header takes the key
// with the same name, and the remaining headers take the remaining keys in
// order, with id-like keys last.
const ID_KEYS = new Set(["id", "key", "uuid"]);

function normalizeTableRows(props: Record<string, any>) {
  if (!Array.isArray(props.rows) || !Array.isArray(props.headers)) return props;
  const headers = (props.headers as unknown[]).map((h) =>
    normalizeKey(String(h)),
  );
  const rows = props.rows.map((row: unknown) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const entries = Object.entries(row as Record<string, unknown>).map(
      ([k, v]) => [normalizeKey(k), v] as const,
    );
    const byKey = new Map(entries);
    const unmatched = entries.filter(([k]) => !headers.includes(k));
    const rest = [
      ...unmatched.filter(([k]) => !ID_KEYS.has(k)),
      ...unmatched.filter(([k]) => ID_KEYS.has(k)),
    ];
    return headers.map((h) =>
      byKey.has(h) ? byKey.get(h) : rest.shift()?.[1],
    );
  });
  return { ...props, rows };
}

function validateProps(
  elements: Record<string, Element>,
  defs: ComponentDefs,
): string[] {
  const issues: string[] = [];
  for (const [key, el] of Object.entries(elements)) {
    const def = defs[el.type];
    if (!def) {
      issues.push(`${key}: unknown component "${el.type}"`);
      continue;
    }
    const props =
      el.type === "Table"
        ? normalizeTableRows(el.props ?? {})
        : (el.props ?? {});
    const parsed = def.props.safeParse(props);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        issues.push(`${key}.props.${issue.path.join(".")}: ${issue.message}`);
    } else {
      el.props = parsed.data as Record<string, any>;
    }
  }
  return issues;
}

function validateStructure(
  spec: Spec,
  elements: Record<string, Element>,
  defs: Record<string, { slots?: readonly string[] }>,
): string[] {
  const issues: string[] = [];
  const root = elements[spec.root];
  if (!root) issues.push(`root "${spec.root}" is not an element`);
  else if (root.type !== "Card") issues.push("root must be a Card");
  else if (
    !root.props.title &&
    !root.props.subtitle &&
    !root.props.imageUrl &&
    !root.children.length
  )
    issues.push("the Card needs a title, an image or at least one child");

  for (const [key, el] of Object.entries(elements)) {
    if (el.children.length && !defs[el.type]?.slots?.length)
      issues.push(`${key}: ${el.type} cannot have children`);
    for (const childKey of el.children) {
      const child = elements[childKey];
      if (!child) {
        issues.push(`${key}: missing child "${childKey}"`);
        continue;
      }
      if (el.type === "Fields" && child.type !== "Field")
        issues.push(`${key}: Fields only holds Field elements`);
      if (
        el.type === "Actions" &&
        !["Button", "LinkButton"].includes(child.type)
      )
        issues.push(
          `${key}: Actions only holds Button and LinkButton elements`,
        );
    }
    if (el.type === "Table") {
      const width = el.props.headers.length;
      el.props.rows.forEach((row: string[], i: number) => {
        if (row.length !== width)
          issues.push(
            `${key}: row ${i} has ${row.length} cells, expected ${width}`,
          );
      });
    }
    if (el.type === "Chart" && el.props.chart.type !== "pie") {
      const count = el.props.chart.categories.length;
      for (const series of el.props.chart.series)
        if (series.values.length !== count)
          issues.push(
            `${key}: series "${series.name}" has ${series.values.length} values, expected ${count}`,
          );
    }
  }
  return issues;
}

function validateLimits(
  elements: Record<string, Element>,
  limits: CardLimits,
): string[] {
  const issues: string[] = [];
  const all = Object.entries(elements);
  const count = (type: string) =>
    all.filter(([, el]) => el.type === type).length;
  const over = (value: number, max: number | undefined) =>
    max !== undefined && value > max;

  if (over(count("Table"), limits.tables))
    issues.push(`at most ${limits.tables} Table per message`);
  if (over(count("Chart"), limits.charts))
    issues.push(`at most ${limits.charts} Chart per message`);

  for (const [key, el] of all) {
    const p = el.props;
    if (el.type === "Fields" && over(el.children.length, limits.fields))
      issues.push(`${key}: at most ${limits.fields} fields`);
    if (el.type === "Table") {
      if (over(p.rows.length + 1, limits.tableRows))
        issues.push(
          `${key}: at most ${limits.tableRows} rows including the header`,
        );
      if (over(p.headers.length, limits.tableColumns))
        issues.push(`${key}: at most ${limits.tableColumns} columns`);
    }
    if (el.type === "Chart") {
      const c = p.chart;
      if (over(p.title.length, limits.chartTitle))
        issues.push(
          `${key}: title longer than ${limits.chartTitle} characters`,
        );
      const labels: string[] =
        c.type === "pie"
          ? c.segments.map((s: { label: string }) => s.label)
          : [...c.categories, ...c.series.map((s: { name: string }) => s.name)];
      for (const label of labels)
        if (over(label.length, limits.chartLabel))
          issues.push(
            `${key}: label "${label}" longer than ${limits.chartLabel} characters`,
          );
      const groups = c.type === "pie" ? c.segments.length : c.series.length;
      if (over(groups, limits.chartSeries))
        issues.push(`${key}: at most ${limits.chartSeries} series or segments`);
      if (c.type !== "pie" && over(c.categories.length, limits.chartPoints))
        issues.push(`${key}: at most ${limits.chartPoints} categories`);
    }
  }
  return issues;
}

function toChild(key: string, elements: Record<string, Element>): CardChild {
  const el = elements[key]!;
  const p = el.props;
  const children = () => el.children.map((k) => elements[k]!);
  switch (el.type) {
    case "Section":
      return build.section(el.children.map((k) => toChild(k, elements)));
    case "Card":
      // Chat cards cannot nest, so an inner Card becomes a titled Section.
      return build.section([
        ...(p.title ? [build.text(p.title, "bold")] : []),
        ...(p.subtitle ? [build.text(p.subtitle, "muted")] : []),
        ...el.children.map((k) => toChild(k, elements)),
      ]);
    case "Text":
      return build.text(p.content, p.style ?? undefined);
    case "Divider":
      return build.divider();
    case "Image":
      return build.image(p.url, p.alt);
    case "Fields":
      return build.fields(
        children().map((f) => build.field(f.props.label, f.props.value)),
      );
    case "Table":
      return build.table({
        headers: p.headers,
        rows: p.rows,
        align: p.align ?? undefined,
        caption: p.caption ?? undefined,
      });
    case "Chart": {
      const c = p.chart;
      return build.chart({
        title: p.title,
        chart:
          c.type === "pie"
            ? { type: "pie", segments: c.segments }
            : {
                type: c.type,
                categories: c.categories,
                xLabel: c.xLabel ?? undefined,
                yLabel: c.yLabel ?? undefined,
                series: c.series.map(
                  (s: { name: string; values: number[] }) => ({
                    name: s.name,
                    data: s.values.map((value, i) => ({
                      label: c.categories[i],
                      value,
                    })),
                  }),
                ),
              },
      });
    }
    case "Actions":
      return build.actions(
        children().map((b) =>
          b.type === "LinkButton"
            ? build.linkButton({ label: b.props.label, url: b.props.url })
            : build.button({
                id: b.props.id,
                label: b.props.label,
                style: b.props.style ?? undefined,
                value: b.props.value ?? undefined,
              }),
        ),
      );
    default:
      throw new CardSpecError([`${key}: ${el.type} cannot be nested here`]);
  }
}

/**
 * Turn a spec into literal elements reachable from the root. Prop
 * expressions ($state, $item, $index, $template and so on) resolve against
 * spec.state, `visible` conditions drop elements, and `repeat` renders the
 * element's children once per item, with keys suffixed by the item index.
 */
interface Materialized {
  elements: Record<string, Element>;
  missing: string[];
  overflow: boolean;
}

function materialize(spec: Partial<Spec>, maxElements: number): Materialized {
  const source = (spec.elements ?? {}) as Record<string, Partial<UIElement>>;
  const stateModel = (spec.state ?? {}) as Record<string, unknown>;
  const out: Record<string, Element> = {};
  const missing: string[] = [];
  const seen = new Set<string>();
  let budget = maxElements;
  let overflow = false;
  // Spend one unit of the budget before allocating anything for it.
  const spend = () => {
    if (budget <= 0) {
      overflow = true;
      return false;
    }
    budget -= 1;
    return true;
  };

  const itemsAt = (
    repeat: NonNullable<UIElement["repeat"]>,
    ctx: PropResolutionContext,
  ) => {
    const path = resolveRepeatStatePath(repeat.statePath, ctx.repeatBasePath);
    const items = path ? getByPath(stateModel, path) : undefined;
    return { path: path ?? "", items: Array.isArray(items) ? items : [] };
  };

  const itemContext = (
    path: string,
    item: unknown,
    index: number,
  ): PropResolutionContext => ({
    stateModel,
    repeatItem: item,
    repeatIndex: index,
    repeatBasePath: resolveRepeatItemStatePath(path, index),
  });

  const visit = (
    key: string,
    outKey: string,
    ctx: PropResolutionContext,
  ): boolean => {
    const el = source[key];
    if (!el?.type) {
      missing.push(key);
      return false;
    }
    if (seen.has(outKey)) return false;
    // Outside a repeat scope, the $item and $index parts of a repeat
    // container's visible condition filter its items, as in the React renderer.
    const { container, itemFilter } =
      el.repeat && ctx.repeatIndex === undefined
        ? splitRepeatVisibility(el.visible)
        : { container: el.visible, itemFilter: undefined };
    if (container !== undefined && !evaluateVisibility(container, ctx))
      return false;
    if (!spend()) return false;
    seen.add(outKey);

    const props = (el.props ?? {}) as Record<string, unknown>;
    const childKeys = el.children ?? [];
    const children: string[] = [];
    const repeat = el.repeat;
    const keep = (path: string, item: unknown, index: number) =>
      itemFilter === undefined ||
      evaluateVisibility(itemFilter, itemContext(path, item, index));

    if (repeat && el.type === "Table" && Array.isArray(props.rows)) {
      // A repeated Table treats its rows as a template, one copy per item.
      const { path, items } = itemsAt(repeat, ctx);
      const rows: unknown[] = [];
      for (let index = 0; index < items.length && !overflow; index++) {
        if (!keep(path, items[index], index)) continue;
        const itemCtx = itemContext(path, items[index], index);
        for (const row of props.rows as unknown[]) {
          if (!spend()) break;
          rows.push(resolveElementProps({ row }, itemCtx).row);
        }
      }
      out[outKey] = {
        type: el.type,
        props: { ...resolveElementProps(props, ctx), rows },
        children: [],
      };
      return true;
    }

    if (repeat) {
      const { path, items } = itemsAt(repeat, ctx);
      const scope = outKey === key ? "" : `${outKey}.`;
      for (let index = 0; index < items.length && !overflow; index++) {
        if (!keep(path, items[index], index)) continue;
        const itemCtx = itemContext(path, items[index], index);
        for (const child of childKeys) {
          const childOut = `${child}#${scope}${index}`;
          if (visit(child, childOut, itemCtx)) children.push(childOut);
        }
      }
    } else {
      const suffix = outKey.slice(key.length);
      for (const child of childKeys)
        if (visit(child, child + suffix, ctx)) children.push(child + suffix);
    }
    out[outKey] = {
      type: el.type,
      props: resolveElementProps(props, ctx),
      children,
    };
    return true;
  };

  if (spec.root) visit(spec.root, spec.root, { stateModel });
  return { elements: out, missing, overflow };
}

function buildCard(
  root: Element,
  elements: Record<string, Element>,
  keys: string[],
): CardElement {
  return build.card({
    title: root.props.title ?? undefined,
    subtitle: root.props.subtitle ?? undefined,
    imageUrl: root.props.imageUrl ?? undefined,
    children: keys.map((k) => toChild(k, elements)),
  });
}

/**
 * Validate a spec and convert it to a Chat SDK CardElement that any adapter
 * can post with thread.post(card).
 *
 * Throws CardSpecError with one readable issue per problem, which is meant to
 * go back to the model so it can correct the spec.
 */
export function toCard(spec: Spec, options: ToCardOptions = {}): CardElement {
  const defs = options.components ?? standardComponentDefinitions;
  if (!spec || typeof spec.root !== "string" || !spec.elements)
    throw new CardSpecError(["spec needs a root and elements"]);
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;
  const { elements, missing, overflow } = materialize(spec, maxElements);
  if (overflow)
    throw new CardSpecError([
      `the spec expands to more than ${maxElements} elements and table rows`,
    ]);
  let issues = validateProps(elements, defs as ComponentDefs);
  if (!issues.length)
    issues = [
      ...missing.map((key) => `missing element "${key}"`),
      ...validateStructure(spec, elements, defs as ComponentDefs),
    ];
  if (!issues.length && options.limits)
    issues = validateLimits(elements, options.limits);
  if (issues.length) throw new CardSpecError(issues);
  const root = elements[spec.root]!;
  return buildCard(root, elements, root.children);
}

/**
 * Best-effort card for a spec that is still streaming. Keeps the elements
 * whose props already validate and whose children have arrived, and returns
 * null until the root Card exists.
 */
export function toPartialCard(
  spec: Partial<Spec>,
  options: Pick<ToCardOptions, "components" | "maxElements"> = {},
): CardElement | null {
  const defs = (options.components ??
    standardComponentDefinitions) as ComponentDefs;
  // Past the budget the partial card keeps what was expanded so far.
  const all = materialize(
    spec,
    options.maxElements ?? DEFAULT_MAX_ELEMENTS,
  ).elements;
  const ok: Record<string, Element> = {};
  for (const [key, el] of Object.entries(all)) {
    const parsed = defs[el.type]?.props.safeParse(
      el.type === "Table" ? normalizeTableRows(el.props) : el.props,
    );
    if (parsed?.success)
      ok[key] = { ...el, props: parsed.data as Record<string, any> };
  }
  for (const el of Object.values(ok))
    el.children = el.children.filter((c) => ok[c]);
  const root = spec.root ? ok[spec.root] : undefined;
  if (!root || root.type !== "Card") return null;
  const ready = (key: string) => {
    const el = ok[key]!;
    if (key === spec.root) return false;
    if (el.type === "Fields" || el.type === "Actions" || el.type === "Section")
      return el.children.length > 0;
    return true;
  };
  const keys: string[] = [];
  for (const key of root.children.filter(ready)) {
    try {
      toChild(key, ok);
      keys.push(key);
    } catch {
      // Skip children that are not complete yet.
    }
  }
  return buildCard(root, ok, keys);
}

import {
  evaluateVisibility,
  getByPath,
  resolveElementProps,
  resolveRepeatItemStatePath,
  resolveRepeatStatePath,
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

type ComponentDefs = Record<string, { props: ZodType }>;

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
}

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
): string[] {
  const issues: string[] = [];
  const root = elements[spec.root];
  if (!root) issues.push(`root "${spec.root}" is not an element`);
  else if (root.type !== "Card") issues.push("root must be a Card");

  for (const [key, el] of Object.entries(elements)) {
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
function materialize(
  spec: Partial<Spec>,
  missing: string[] = [],
): Record<string, Element> {
  const source = (spec.elements ?? {}) as Record<string, Partial<UIElement>>;
  const stateModel = (spec.state ?? {}) as Record<string, unknown>;
  const out: Record<string, Element> = {};
  const seen = new Set<string>();

  const visit = (key: string, outKey: string, ctx: PropResolutionContext) => {
    const el = source[key];
    if (!el?.type) {
      missing.push(key);
      return false;
    }
    if (seen.has(outKey)) return false;
    if (el.visible !== undefined && !evaluateVisibility(el.visible, ctx))
      return false;
    seen.add(outKey);
    const children: string[] = [];
    const childKeys = el.children ?? [];
    const props = (el.props ?? {}) as Record<string, unknown>;
    if (el.repeat && el.type === "Table" && Array.isArray(props.rows)) {
      // A repeated Table treats its rows as a template, one copy per item.
      const path = resolveRepeatStatePath(
        el.repeat.statePath,
        ctx.repeatBasePath,
      );
      const items = path ? getByPath(stateModel, path) : undefined;
      const rows = (Array.isArray(items) ? items : []).flatMap((item, index) =>
        (props.rows as unknown[]).map(
          (row) =>
            resolveElementProps(
              { row },
              {
                stateModel,
                repeatItem: item,
                repeatIndex: index,
                repeatBasePath: resolveRepeatItemStatePath(path!, index),
              },
            ).row,
        ),
      );
      out[outKey] = {
        type: el.type,
        props: { ...resolveElementProps(props, ctx), rows },
        children: [],
      };
      return true;
    }
    if (el.repeat) {
      const path = resolveRepeatStatePath(
        el.repeat.statePath,
        ctx.repeatBasePath,
      );
      const items = path ? getByPath(stateModel, path) : undefined;
      (Array.isArray(items) ? items : []).forEach((item, index) => {
        const itemCtx: PropResolutionContext = {
          stateModel,
          repeatItem: item,
          repeatIndex: index,
          repeatBasePath: resolveRepeatItemStatePath(path!, index),
        };
        for (const child of childKeys) {
          const childOut = `${child}#${outKey === key ? "" : `${outKey}.`}${index}`;
          if (visit(child, childOut, itemCtx)) children.push(childOut);
        }
      });
    } else {
      const suffix = outKey.slice(key.length);
      for (const child of childKeys)
        if (visit(child, child + suffix, ctx)) children.push(child + suffix);
    }
    out[outKey] = {
      type: el.type,
      props: resolveElementProps(
        (el.props ?? {}) as Record<string, unknown>,
        ctx,
      ),
      children,
    };
    return true;
  };

  if (spec.root) visit(spec.root, spec.root, { stateModel });
  return out;
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
  const missing: string[] = [];
  const elements = materialize(spec, missing);
  let issues = validateProps(elements, defs as ComponentDefs);
  if (!issues.length)
    issues = [
      ...missing.map((key) => `missing element "${key}"`),
      ...validateStructure(spec, elements),
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
  options: Pick<ToCardOptions, "components"> = {},
): CardElement | null {
  const defs = (options.components ??
    standardComponentDefinitions) as ComponentDefs;
  const all = materialize(spec);
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

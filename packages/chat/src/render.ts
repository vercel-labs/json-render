import type { Spec } from "@json-render/core";
import {
  Actions,
  Button,
  Card,
  CardText,
  Chart,
  Divider,
  Field,
  Fields,
  Image,
  LinkButton,
  Section,
  Table,
  type CardChild,
  type CardElement,
} from "chat";
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
    const parsed = def.props.safeParse(el.props ?? {});
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
      return Section(el.children.map((k) => toChild(k, elements)));
    case "Text":
      return CardText(p.content, { style: p.style ?? undefined });
    case "Divider":
      return Divider();
    case "Image":
      return Image({ url: p.url, alt: p.alt });
    case "Fields":
      return Fields(
        children().map((f) =>
          Field({ label: f.props.label, value: f.props.value }),
        ),
      );
    case "Table":
      return Table({
        headers: p.headers,
        rows: p.rows,
        align: p.align ?? undefined,
        caption: p.caption ?? undefined,
      });
    case "Chart": {
      const c = p.chart;
      return Chart({
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
      return Actions(
        children().map((b) =>
          b.type === "LinkButton"
            ? LinkButton({ label: b.props.label, url: b.props.url })
            : Button({
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

function cloneElements(spec: Partial<Spec>): Record<string, Element> {
  const out: Record<string, Element> = {};
  for (const [key, el] of Object.entries(spec.elements ?? {})) {
    const e = el as Partial<Element> | undefined;
    if (!e?.type) continue;
    out[key] = {
      type: e.type,
      props: { ...(e.props ?? {}) },
      children: [...(e.children ?? [])],
    };
  }
  return out;
}

function buildCard(
  root: Element,
  elements: Record<string, Element>,
  keys: string[],
): CardElement {
  return Card({
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
  const elements = cloneElements(spec);
  let issues = validateProps(elements, defs as ComponentDefs);
  if (!issues.length) issues = validateStructure(spec, elements);
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
  const all = cloneElements(spec);
  const ok: Record<string, Element> = {};
  for (const [key, el] of Object.entries(all)) {
    const parsed = defs[el.type]?.props.safeParse(el.props);
    if (parsed?.success)
      ok[key] = { ...el, props: parsed.data as Record<string, any> };
  }
  for (const el of Object.values(ok))
    el.children = el.children.filter((c) => ok[c]);
  const root = spec.root ? ok[spec.root] : undefined;
  if (!root || root.type !== "Card") return null;
  const ready = (key: string) => {
    const el = ok[key]!;
    if (el.type === "Card") return false;
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

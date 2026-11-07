import { defineSchema, type Spec } from "@json-render/core";
import { z } from "zod";
import { CardSpecError, materialize } from "./render";
import {
  slackBlockDefinitions,
  slackComponentDefinitions,
  type SlackBlockComponent,
  type SlackBlockType,
} from "./slack-catalog";

export const slackSchema = defineSchema(
  (s) => ({
    spec: s.object({
      root: s.string(),
      elements: s.record(
        s.object({
          type: s.ref("catalog.components"),
          props: s.propsOf("catalog.components"),
          children: s.array(s.string()),
          visible: { ...s.any(), ...s.optional() },
          repeat: { ...s.any(), ...s.optional() },
        }),
      ),
    }),
    catalog: s.object({
      components: s.map({
        props: s.zod(),
        slots: s.array(s.string()),
        description: s.string(),
        example: s.any(),
      }),
    }),
  }),
  {
    defaultRules: [
      "The root MUST be SlackMessage. Its children are Slack blocks or SlackGroup elements.",
      "SlackGroup flattens its children into the block list. Use repeat and visible on groups to generate or hide blocks.",
      "Every native Slack block is a leaf with children: []. Put nested Block Kit elements, composition objects, and child blocks directly in props using Slack's field names and type discriminators.",
      "Do not include a top-level type in block props. The component name supplies it. Nested native objects MUST include their Slack type when required.",
      "Use Slack text objects ({type: plain_text or mrkdwn, text: ...}) where required.",
      "This catalog is for posted messages. Modal-only alert blocks, file blocks, input blocks, and standalone Markdown, rich-text, and video blocks are not exposed.",
      "The caller posts these blocks through Slack's Web API. Native Slack blocks cannot be passed to Chat SDK thread.post or streamCard.",
    ],
  },
);

export type SlackSchema = typeof slackSchema;

/** Native JSON, retaining fields introduced independently of Chat SDK. */
export interface SlackBlock {
  type: SlackBlockType;
  [key: string]: z.infer<ReturnType<typeof z.json>>;
}

export interface ToSlackBlocksOptions {
  /** Top-level block budget. Defaults to 50. Slack validates nested limits. */
  maxBlocks?: number;
  /** Spec expansion budget, including groups. Defaults to 1000. */
  maxElements?: number;
}

function positiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new CardSpecError([`${name} must be a positive safe integer`]);
}

/**
 * Resolve a native Slack spec into Block Kit JSON for Slack's Web API.
 * Validates block props and spec structure. Slack validates nested native
 * element semantics, surface eligibility, and aggregate platform limits.
 */
export function toSlackBlocks(
  spec: Spec,
  options: ToSlackBlocksOptions = {},
): SlackBlock[] {
  if (!spec || typeof spec.root !== "string" || !spec.elements)
    throw new CardSpecError(["spec needs a root and elements"]);
  const maxElements = options.maxElements ?? 1000;
  const maxBlocks = options.maxBlocks ?? 50;
  positiveInteger(maxElements, "maxElements");
  positiveInteger(maxBlocks, "maxBlocks");

  // A spec is a tree. Check it before materialization, which otherwise skips
  // shared keys. Do not charge hidden source nodes to the expansion budget.
  const active = new Set<string>();
  const visited = new Set<string>();
  const pending = [{ key: spec.root, exiting: false }];
  while (pending.length) {
    const { key, exiting } = pending.pop()!;
    if (exiting) {
      active.delete(key);
      continue;
    }
    if (active.has(key))
      throw new CardSpecError([`${key}: cycle in element children`]);
    if (visited.has(key))
      throw new CardSpecError([
        `${key}: an element cannot have multiple child references`,
      ]);
    visited.add(key);
    active.add(key);
    const el = spec.elements[key];
    if (el?.repeat && el.type !== "SlackGroup" && el.type !== "SlackMessage")
      throw new CardSpecError([
        `${key}: use a SlackGroup to repeat native blocks`,
      ]);
    pending.push({ key, exiting: true });
    for (const child of [...(el?.children ?? [])].reverse())
      pending.push({ key: child, exiting: false });
  }

  const { elements, missing, overflow } = materialize(spec, maxElements);
  if (overflow)
    throw new CardSpecError([
      `the spec expands to more than ${maxElements} elements`,
    ]);
  const issues = missing.map((key) => `missing element "${key}"`);
  const root = elements[spec.root];
  if (!root || root.type !== "SlackMessage")
    issues.push("root must be a SlackMessage");
  const blocks = new Map<string, SlackBlock>();

  for (const [key, el] of Object.entries(elements)) {
    const def = Object.hasOwn(slackComponentDefinitions, el.type)
      ? slackComponentDefinitions[
          el.type as keyof typeof slackComponentDefinitions
        ]
      : undefined;
    if (!def) {
      issues.push(`${key}: unknown Slack component "${el.type}"`);
      continue;
    }
    if (el.type === "SlackMessage" && key !== spec.root)
      issues.push(`${key}: SlackMessage cannot be nested`);
    if (el.children.length && !def.slots.length)
      issues.push(
        `${key}: ${el.type} cannot have children; use native objects in props`,
      );
    const parsed = def.props.safeParse(el.props);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        issues.push(`${key}.props.${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    if (el.type !== "SlackMessage" && el.type !== "SlackGroup") {
      const native = slackBlockDefinitions[el.type as SlackBlockComponent];
      blocks.set(key, { ...parsed.data, type: native.type } as SlackBlock);
    }
  }
  if (issues.length) throw new CardSpecError(issues);

  const out: SlackBlock[] = [];
  function append(key: string) {
    const block = blocks.get(key);
    if (block) out.push(block);
    else for (const child of elements[key]!.children) append(child);
  }
  append(spec.root);
  if (!out.length)
    throw new CardSpecError(["SlackMessage needs at least one block"]);
  if (out.length > maxBlocks)
    throw new CardSpecError([`at most ${maxBlocks} top-level Slack blocks`]);
  return out;
}

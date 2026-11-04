import type { Spec } from "@json-render/core";
import { cardToSlackBlocks } from "@chat-adapter/slack/blocks";
import { cardToAdaptiveCard } from "@chat-adapter/teams/cards";
import { describe, expect, it } from "vitest";
import type { CardElement } from "chat";
import { CardSpecError, streamCard, toCard, toPartialCard } from "./index";

const report: Spec = {
  root: "card",
  elements: {
    card: {
      type: "Card",
      props: { title: "Weekly deploys", subtitle: "Oct 27 to Nov 2" },
      children: ["kpis", "chart", "table", "actions"],
    },
    kpis: { type: "Fields", props: {}, children: ["f1", "f2"] },
    f1: {
      type: "Field",
      props: { label: "Deploys", value: "1,284" },
      children: [],
    },
    f2: {
      type: "Field",
      props: { label: "Failure rate", value: "2.1%" },
      children: [],
    },
    chart: {
      type: "Chart",
      props: {
        title: "Deploys per day",
        chart: {
          type: "bar",
          categories: ["Mon", "Tue", "Wed"],
          series: [{ name: "Deploys", values: [180, 210, 195] }],
        },
      },
      children: [],
    },
    table: {
      type: "Table",
      props: {
        headers: ["Project", "Deploys"],
        rows: [
          ["web", "412"],
          ["api", "203"],
        ],
        align: ["left", "right"],
      },
      children: [],
    },
    actions: { type: "Actions", props: {}, children: ["ack"] },
    ack: {
      type: "Button",
      props: { id: "ack", label: "Acknowledge", style: "primary" },
      children: [],
    },
  },
} as Spec;

const clone = () => structuredClone(report) as any;

describe("toCard", () => {
  it("renders one spec as native Slack blocks and a Teams Adaptive Card", () => {
    const card = toCard(report);
    expect(cardToSlackBlocks(card as never).map((b) => b.type)).toEqual([
      "header",
      "context",
      "section",
      "data_visualization",
      "data_table",
      "actions",
    ]);
    const teams = cardToAdaptiveCard(card as never) as {
      type: string;
      body: { type: string }[];
      actions: { title: string; type: string }[];
    };
    expect(teams.type).toBe("AdaptiveCard");
    expect(teams.body.map((b) => b.type)).toContain("Table");
    expect(teams.actions).toEqual([
      expect.objectContaining({ title: "Acknowledge", type: "Action.Submit" }),
    ]);
  });

  it("validates props per component type", () => {
    const spec = clone();
    spec.elements.f1.props.label = 42;
    expect(() => toCard(spec)).toThrow(/f1\.props\.label/);
  });

  it("rejects a series with the wrong number of values", () => {
    const spec = clone();
    spec.elements.chart.props.chart.series[0].values = [1, 2];
    expect(() => toCard(spec)).toThrow(/expected 3/);
  });

  it("enforces platform limits only when they are passed", () => {
    const spec = clone();
    spec.elements.table2 = spec.elements.table;
    spec.elements.card.children.push("table2");
    expect(() => toCard(spec)).not.toThrow();
    expect(() => toCard(spec, { limits: { tables: 1 } })).toThrow(
      CardSpecError,
    );
  });
});

describe("toPartialCard", () => {
  it("returns null before the root Card arrives and skips incomplete children", () => {
    expect(toPartialCard({ elements: {} })).toBeNull();
    const card = toPartialCard({
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Hi" },
          children: ["text", "kpis"],
        },
        text: { type: "Text", props: { content: "Hello" }, children: [] },
        kpis: { type: "Fields", props: {}, children: ["f1"] },
      },
    } as Partial<Spec>);
    expect(card?.children.map((c) => c.type)).toEqual(["text"]);
  });
});

describe("streamCard", () => {
  it("posts once, edits as elements land, and ends with the validated card", async () => {
    const calls: Array<{ op: string; children: number }> = [];
    const target = {
      async post(card: CardElement) {
        calls.push({ op: "post", children: card.children.length });
        return {
          async edit(next: CardElement) {
            calls.push({ op: "edit", children: next.children.length });
          },
        };
      },
    };
    const lines = Object.entries(report.elements).map(([key, value]) =>
      JSON.stringify({ op: "add", path: `/elements/${key}`, value }),
    );
    async function* model() {
      yield `${JSON.stringify({ op: "add", path: "/root", value: "card" })}\n`;
      for (const line of lines) yield `${line}\n`;
    }
    const result = await streamCard(target, model(), { updateIntervalMs: 0 });
    expect(calls[0]?.op).toBe("post");
    expect(calls.filter((c) => c.op === "post")).toHaveLength(1);
    expect(calls.at(-1)?.children).toBe(4);
    expect(result.card.title).toBe("Weekly deploys");
  });
});

import type { Spec } from "@json-render/core";
import { cardToSlackBlocks } from "@chat-adapter/slack/blocks";
import { cardToAdaptiveCard } from "@chat-adapter/teams/cards";
import { describe, expect, it } from "vitest";
import type { CardElement, Thread } from "chat";
import {
  CardSpecError,
  streamCard,
  toCard,
  toPartialCard,
  type CardTarget,
} from "./index";

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

// A Chat SDK Thread must be usable as a streamCard target without casts.
export const threadIsCardTarget = (thread: Thread): CardTarget => thread;

describe("state expressions", () => {
  it("resolves $state props against spec.state", () => {
    const card = toCard({
      root: "card",
      state: { total: "985" },
      elements: {
        card: { type: "Card", props: { title: "Deploys" }, children: ["kpis"] },
        kpis: { type: "Fields", props: {}, children: ["f"] },
        f: {
          type: "Field",
          props: { label: "Total", value: { $state: "/total" } },
          children: [],
        },
      },
    } as unknown as Spec);
    expect(card.children[0]).toEqual({
      type: "fields",
      children: [{ type: "field", label: "Total", value: "985" }],
    });
  });
});

describe("repeat", () => {
  it("renders a repeated element's children once per state item", () => {
    const card = toCard({
      root: "card",
      state: {
        people: [
          { name: "Ana", done: 3 },
          { name: "Luis", done: 5 },
        ],
      },
      elements: {
        card: { type: "Card", props: { title: "Standup" }, children: ["list"] },
        list: {
          type: "Section",
          props: {},
          repeat: { statePath: "/people" },
          children: ["kpis"],
        },
        kpis: { type: "Fields", props: {}, children: ["who"] },
        who: {
          type: "Field",
          props: { label: { $item: "name" }, value: { $item: "done" } },
          children: [],
        },
      },
    } as unknown as Spec);
    expect(card.children[0]).toEqual({
      type: "section",
      children: [
        {
          type: "fields",
          children: [{ type: "field", label: "Ana", value: "3" }],
        },
        {
          type: "fields",
          children: [{ type: "field", label: "Luis", value: "5" }],
        },
      ],
    });
  });

  it("reports children that never arrived", () => {
    const spec = clone();
    spec.elements.card.children.push("ghost");
    expect(() => toCard(spec)).toThrow(/missing element "ghost"/);
  });
});

describe("nested cards", () => {
  it("renders an inner Card as a titled Section", () => {
    const card = toCard({
      root: "card",
      elements: {
        card: { type: "Card", props: { title: "Standup" }, children: ["ana"] },
        ana: { type: "Card", props: { title: "Ana" }, children: ["note"] },
        note: {
          type: "Text",
          props: { content: "Shipped the API" },
          children: [],
        },
      },
    } as unknown as Spec);
    expect(card.children[0]).toEqual({
      type: "section",
      children: [
        { type: "text", content: "Ana", style: "bold" },
        { type: "text", content: "Shipped the API", style: undefined },
      ],
    });
  });
});

describe("table rows from state", () => {
  it("accepts rows bound to an array of objects", () => {
    const card = toCard({
      root: "card",
      state: { people: [{ name: "Ana", points: 16 }] },
      elements: {
        card: { type: "Card", props: {}, children: ["t"] },
        t: {
          type: "Table",
          props: { headers: ["Name", "Points"], rows: { $state: "/people" } },
          children: [],
        },
      },
    } as unknown as Spec);
    expect(card.children[0]).toMatchObject({
      type: "table",
      rows: [["Ana", "16"]],
    });
  });
});

describe("repeated table", () => {
  it("expands template rows once per item", () => {
    const card = toCard({
      root: "card",
      state: {
        prs: [
          { author: "ana", age: 2 },
          { author: "luis", age: 5 },
        ],
      },
      elements: {
        card: { type: "Card", props: {}, children: ["t"] },
        t: {
          type: "Table",
          props: {
            headers: ["Author", "Age"],
            rows: [{ a: { $item: "author" }, b: { $item: "age" } }],
          },
          repeat: { statePath: "/prs" },
          children: [],
        },
      },
    } as unknown as Spec);
    expect(card.children[0]).toMatchObject({
      rows: [
        ["ana", "2"],
        ["luis", "5"],
      ],
    });
  });
});

describe("object rows", () => {
  it("matches object keys to headers by name and ignores extra keys", () => {
    const card = toCard({
      root: "card",
      state: { prs: [{ id: 7, status: "open", author: "ana" }] },
      elements: {
        card: { type: "Card", props: {}, children: ["t"] },
        t: {
          type: "Table",
          props: { headers: ["Author", "Status"], rows: { $state: "/prs" } },
          children: [],
        },
      },
    } as unknown as Spec);
    expect(card.children[0]).toMatchObject({ rows: [["ana", "open"]] });
  });
});

describe("object rows with partial header matches", () => {
  it("fills unmatched headers with the remaining non-id keys", () => {
    const card = toCard({
      root: "card",
      state: {
        prs: [{ id: "1", title: "Add auth", author: "ana", age: "2d" }],
      },
      elements: {
        card: { type: "Card", props: {}, children: ["t"] },
        t: {
          type: "Table",
          props: { headers: ["PR", "Author", "Age"], rows: { $state: "/prs" } },
          children: [],
        },
      },
    } as unknown as Spec);
    expect(card.children[0]).toMatchObject({
      rows: [["Add auth", "ana", "2d"]],
    });
  });
});

describe("review fixes", () => {
  // Six nested repeats over ten items would expand to a million elements.
  const bomb = () => {
    const elements: Record<string, unknown> = {
      card: { type: "Card", props: { title: "Bomb" }, children: ["l0"] },
    };
    for (let i = 0; i < 6; i++)
      elements[`l${i}`] = {
        type: "Section",
        props: {},
        repeat: { statePath: "/items" },
        children: [i < 5 ? `l${i + 1}` : "leaf"],
      };
    elements.leaf = { type: "Text", props: { content: "x" }, children: [] };
    return {
      root: "card",
      state: { items: Array.from({ length: 10 }, (_, i) => i) },
      elements,
    } as unknown as Spec;
  };

  it("stops expanding nested repeats at the element budget", () => {
    const started = Date.now();
    expect(() => toCard(bomb())).toThrow(/more than 1000 elements/);
    const partial = toPartialCard(bomb());
    expect(Date.now() - started).toBeLessThan(2000);
    const count = (node: unknown): number =>
      1 +
      (
        ((node as { children?: unknown[] }).children ?? []) as unknown[]
      ).reduce<number>((sum, child) => sum + count(child), 0);
    expect(count(partial)).toBeLessThanOrEqual(1001);
  });

  it("rejects children under a component without slots", () => {
    const spec = clone();
    spec.elements.extra = {
      type: "Text",
      props: { content: "lost" },
      children: [],
    };
    spec.elements.summary = {
      type: "Text",
      props: { content: "hi" },
      children: ["extra"],
    };
    spec.elements.card.children.push("summary");
    expect(() => toCard(spec)).toThrow(/summary: Text cannot have children/);
  });

  it("filters repeat items by the container's item-scoped visible condition", () => {
    const card = toCard({
      root: "card",
      state: {
        todos: [
          { t: "a", status: "todo" },
          { t: "b", status: "done" },
        ],
      },
      elements: {
        card: { type: "Card", props: { title: "Todos" }, children: ["list"] },
        list: {
          type: "Section",
          props: {},
          repeat: { statePath: "/todos" },
          visible: { $item: "status", eq: "todo" },
          children: ["row"],
        },
        row: { type: "Text", props: { content: { $item: "t" } }, children: [] },
      },
    } as unknown as Spec);
    expect(card.children[0]).toEqual({
      type: "section",
      children: [{ type: "text", content: "a", style: undefined }],
    });
  });

  it("rejects an empty Card", () => {
    expect(() =>
      toCard({
        root: "card",
        elements: { card: { type: "Card", props: {}, children: [] } },
      } as unknown as Spec),
    ).toThrow(/needs a title or at least one child/);
  });

  it("does not post a titleless card before its first child arrives", async () => {
    const posts: number[] = [];
    const target = {
      async post(card: CardElement) {
        posts.push(card.children.length);
        return { async edit() {} };
      },
    };
    async function* model() {
      yield `${JSON.stringify({ op: "add", path: "/root", value: "card" })}\n`;
      yield `${JSON.stringify({ op: "add", path: "/elements/card", value: { type: "Card", props: {}, children: ["t"] } })}\n`;
      yield `${JSON.stringify({ op: "add", path: "/elements/t", value: { type: "Text", props: { content: "Hi" }, children: [] } })}\n`;
    }
    await streamCard(target, model(), { updateIntervalMs: 0 });
    expect(posts).toEqual([1]);
  });
});

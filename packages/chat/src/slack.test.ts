import { defineCatalog, type Spec } from "@json-render/core";
import type { SlackAdapter } from "@chat-adapter/slack";
import { describe, expect, it } from "vitest";
import { slackBlockDefinitions } from "./slack-catalog";
import {
  CardSpecError,
  slackComponentDefinitions,
  slackSchema,
  toSlackBlocks,
} from "./index";

function specFor(type: string, props: Record<string, unknown>): Spec {
  return {
    root: "message",
    elements: {
      message: { type: "SlackMessage", props: {}, children: ["block"] },
      block: { type, props, children: [] },
    },
  } as Spec;
}

const plain = (text: string) => ({ type: "plain_text", text });
const option = { text: plain("Production"), value: "production" };

describe("native Slack catalog", () => {
  it("exposes the selected message blocks", () => {
    expect(
      Object.values(slackBlockDefinitions)
        .map((d) => d.type)
        .sort(),
    ).toEqual(
      [
        "actions",
        "alert",
        "card",
        "carousel",
        "container",
        "context_actions",
        "context",
        "data_table",
        "data_visualization",
        "divider",
        "header",
        "image",
        "layout",
        "plan",
        "section",
        "table",
        "task_card",
      ].sort(),
    );
  });

  it("produces a catalog prompt with native Slack rules and examples", () => {
    const catalog = defineCatalog(slackSchema, {
      components: slackComponentDefinitions,
    });
    const prompt = catalog.prompt();
    expect(prompt).toContain("SlackMessage");
    expect(prompt).toContain("SlackLayout");
    expect(prompt).toContain("Nested native objects");
    expect(prompt).not.toContain("root element MUST be a Card");
  });

  it.each(Object.entries(slackBlockDefinitions))(
    "renders %s without losing native fields",
    (name, def) => {
      expect(toSlackBlocks(specFor(name, def.example))).toEqual([
        { ...def.example, type: def.type },
      ]);
    },
  );
});

describe("native nested elements and composition objects", () => {
  const interactive = [
    {
      type: "button",
      text: plain("Approve"),
      value: "yes",
      accessibility_label: "Approve deployment",
      confirm: {
        title: plain("Confirm"),
        text: plain("Deploy?"),
        confirm: plain("Yes"),
        deny: plain("No"),
      },
    },
    { type: "checkboxes", options: [option], initial_options: [option] },
    { type: "radio_buttons", options: [option], initial_option: option },
    { type: "datepicker", initial_date: "2026-11-07" },
    { type: "datetimepicker", initial_date_time: 1794009600 },
    { type: "timepicker", initial_time: "12:00", timezone: "America/Chicago" },
    { type: "overflow", options: [{ ...option, url: "https://example.com" }] },
    {
      type: "static_select",
      option_groups: [{ label: plain("Environments"), options: [option] }],
    },
    { type: "external_select", min_query_length: 2 },
    { type: "users_select", initial_user: "U123" },
    {
      type: "conversations_select",
      filter: { include: ["public"], exclude_bot_users: true },
    },
    { type: "channels_select", initial_channel: "C123" },
    { type: "multi_static_select", options: [option], max_selected_items: 3 },
    { type: "multi_external_select", min_query_length: 1 },
    { type: "multi_users_select", initial_users: ["U123"] },
    { type: "multi_conversations_select", initial_conversations: ["C123"] },
    { type: "multi_channels_select", initial_channels: ["C123"] },
    {
      type: "workflow_button",
      text: plain("Run"),
      workflow: {
        trigger: {
          url: "https://slack.com/shortcuts/example",
          customizable_input_parameters: [{ name: "project", value: "web" }],
        },
      },
    },
  ];
  it.each(interactive)(
    "retains $type and its composition objects",
    (element) => {
      const native = { ...element, action_id: "action" };
      expect(
        toSlackBlocks(specFor("SlackActions", { elements: [native] }))[0],
      ).toEqual({ type: "actions", elements: [native] });
    },
  );

  it("retains feedback buttons, icon buttons, and Slack icons", () => {
    const elements = [
      {
        type: "feedback_buttons",
        action_id: "feedback",
        positive_button: { text: plain("Helpful"), value: "good" },
        negative_button: { text: plain("Unhelpful"), value: "bad" },
      },
      {
        type: "icon_button",
        action_id: "copy",
        icon: "copy",
        text: plain("Copy"),
      },
    ];
    expect(
      toSlackBlocks(specFor("SlackContextActions", { elements }))[0],
    ).toEqual({ type: "context_actions", elements });
    const props = {
      title: plain("Report"),
      slack_icon: { icon: "file", color: "blue" },
    };
    expect(toSlackBlocks(specFor("SlackCard", props))[0]).toEqual({
      type: "card",
      ...props,
    });
  });

  it("preserves action cells and native layout fallbacks", () => {
    const table = {
      caption: "Tasks",
      row_header_column_index: 0,
      page_size: 5,
      rows: [
        [{ type: "raw_text", text: "Task" }],
        [
          {
            type: "action_cell",
            element: {
              type: "button",
              text: plain("Done"),
              action_id: "done",
              value: "task-1",
            },
            fallback: { type: "raw_text", text: "Open" },
          },
        ],
      ],
    };
    const props = {
      label: "Tasks",
      grid_lines: "rows",
      rows: [
        {
          items: [
            {
              block: { type: "section", text: plain("Open tasks") },
              width: "wide",
              horizontal_alignment: "start",
            },
          ],
        },
      ],
      fallback: [{ type: "section", text: plain("Open tasks") }],
    };
    expect(toSlackBlocks(specFor("SlackLayout", props))[0]).toEqual({
      type: "layout",
      ...props,
    });
    expect(toSlackBlocks(specFor("SlackDataTable", table))[0]).toEqual({
      type: "data_table",
      ...table,
    });
  });

  it("keeps native task details and container presentation options", () => {
    const task = {
      task_id: "build",
      title: "Build",
      status: "complete",
      output: {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              { type: "text", text: "Build passed", style: { bold: true } },
            ],
          },
        ],
      },
      sources: [
        { type: "url", url: "https://example.com/build", text: "Build log" },
      ],
    };
    expect(
      toSlackBlocks(specFor("SlackPlan", { title: "Deploy", tasks: [task] })),
    ).toEqual([{ type: "plan", title: "Deploy", tasks: [task] }]);
    const container = {
      title: plain("Build details"),
      is_collapsible: true,
      default_collapsed: true,
      width: "wide",
      child_blocks: [
        { type: "section", text: { type: "mrkdwn", text: "Build passed" } },
      ],
    };
    expect(toSlackBlocks(specFor("SlackContainer", container))).toEqual([
      { type: "container", ...container },
    ]);
  });
});

describe("native spec resolution and validation", () => {
  it("resolves nested state, repeats groups, and filters items", () => {
    const spec = {
      root: "message",
      state: {
        items: [
          { name: "Web", show: true },
          { name: "API", show: false },
        ],
      },
      elements: {
        message: { type: "SlackMessage", props: {}, children: ["group"] },
        group: {
          type: "SlackGroup",
          props: {},
          children: ["section"],
          repeat: { statePath: "/items" },
          visible: { $item: "show", eq: true },
        },
        section: {
          type: "SlackSection",
          props: { text: { type: "plain_text", text: { $item: "name" } } },
          children: [],
        },
      },
    } as unknown as Spec;
    expect(toSlackBlocks(spec)).toEqual([
      { type: "section", text: plain("Web") },
    ]);
  });

  it("reports invalid props with element paths", () => {
    expect(() =>
      toSlackBlocks(specFor("SlackHeader", { text: plain("x".repeat(151)) })),
    ).toThrow(/block.props.text.text/);
    expect(() =>
      toSlackBlocks(specFor("SlackActions", { elements: [] })),
    ).toThrow(CardSpecError);
    expect(() =>
      toSlackBlocks(specFor("SlackDivider", { type: "video" })),
    ).toThrow(/block.props.type/);
    expect(() => toSlackBlocks(specFor("SlackSection", {}))).toThrow(
      /section needs text or fields/,
    );
  });

  it("rejects missing children, unknown components, nested roots, and cycles", () => {
    const spec = specFor("SlackDivider", {});
    spec.elements.message!.children!.push("missing");
    expect(() => toSlackBlocks(spec)).toThrow(/missing element "missing"/);
    expect(() => toSlackBlocks(specFor("Text", { content: "hello" }))).toThrow(
      /unknown Slack component/,
    );
    expect(() => toSlackBlocks(specFor("SlackMessage", {}))).toThrow(
      /cannot be nested/,
    );
    spec.elements.block!.children = ["message"];
    expect(() => toSlackBlocks(spec)).toThrow(/cycle/);
  });

  it("rejects children on native blocks and empty messages", () => {
    const spec = specFor("SlackSection", { text: plain("Hello") });
    spec.elements.block!.children = ["child"];
    spec.elements.child = { type: "SlackDivider", props: {}, children: [] };
    expect(() => toSlackBlocks(spec)).toThrow(/cannot have children/);
    spec.elements.message!.children = [];
    expect(() => toSlackBlocks(spec)).toThrow(/needs at least one block/);
  });

  it("does not expose file, input, Markdown, rich-text, or video blocks", () => {
    for (const type of [
      "SlackFile",
      "SlackInput",
      "SlackMarkdown",
      "SlackRichText",
      "SlackVideo",
    ])
      expect(() => toSlackBlocks(specFor(type, {}))).toThrow(
        /unknown Slack component/,
      );
  });

  it("charges the expansion budget after filtering hidden subtrees", () => {
    const spec = specFor("SlackDivider", {});
    spec.elements.message!.children!.push("hidden");
    spec.elements.hidden = {
      type: "SlackGroup",
      props: {},
      visible: false,
      children: ["unused"],
    };
    spec.elements.unused = { type: "SlackDivider", props: {}, children: [] };
    expect(toSlackBlocks(spec, { maxElements: 2 })).toEqual([
      { type: "divider" },
    ]);
  });

  it("rejects shared references and repeat on native leaves", () => {
    const spec = specFor("SlackDivider", {});
    spec.elements.message!.children!.push("block");
    expect(() => toSlackBlocks(spec)).toThrow(/multiple child references/);
    spec.elements.message!.children = ["block"];
    spec.elements.block!.repeat = { statePath: "/items" };
    spec.state = { items: [1, 2, 3] };
    expect(() => toSlackBlocks(spec)).toThrow(/use a SlackGroup/);
  });

  it("enforces block and expansion budgets", () => {
    const spec = specFor("SlackDivider", {});
    spec.elements.message!.children = ["group"];
    spec.elements.group = {
      type: "SlackGroup",
      props: {},
      children: ["block"],
      repeat: { statePath: "/items" },
    };
    spec.state = { items: Array.from({ length: 51 }, () => ({})) };
    expect(() => toSlackBlocks(spec)).toThrow(/at most 50/);
    expect(toSlackBlocks(spec, { maxBlocks: 100 })).toHaveLength(51);
    expect(() => toSlackBlocks(spec, { maxElements: 10 })).toThrow(
      /more than 10/,
    );
    expect(() => toSlackBlocks(spec, { maxElements: Infinity })).toThrow(
      /positive safe integer/,
    );
  });
});

// Compile the documented Slack adapter integration without making a network call.
export const postNativeSlack = async (
  adapter: SlackAdapter,
  spec: Spec,
): Promise<void> => {
  await adapter.webClient.chat.postMessage({
    channel: "C123",
    text: "Report",
    blocks: toSlackBlocks(spec),
  });
};

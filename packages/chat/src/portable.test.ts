import type { Spec } from "@json-render/core";
import { cardToSlackBlocks } from "@chat-adapter/slack/blocks";
import { cardToAdaptiveCard } from "@chat-adapter/teams/cards";
import { describe, expect, it } from "vitest";
import { CardSpecError, toCard, toPartialCard } from "./index";

function specWith(type: string, props: Record<string, unknown> = {}): Spec {
  return {
    root: "root",
    elements: {
      root: { type: "Card", props: { title: "Report" }, children: ["content"] },
      content: { type, props, children: [] },
    },
  } as Spec;
}

describe("portable layouts", () => {
  it.each(["Columns", "Carousel"])(
    "keeps %s items, images and actions in portable sections",
    (type) => {
      const spec = specWith(type);
      spec.elements.content!.children = ["item"];
      spec.elements.item = {
        type: "Card",
        props: {
          title: "Project",
          imageUrl: "https://example.com/project.png",
        },
        children: ["text", "actions"],
      };
      spec.elements.text = {
        type: "Text",
        props: { content: "Deployment complete" },
        children: [],
      };
      spec.elements.actions = {
        type: "Actions",
        props: {},
        children: ["button"],
      };
      spec.elements.button = {
        type: "Button",
        props: { id: "approve", label: "Approve", value: "project" },
        children: [],
      };
      const card = toCard(spec);
      expect(card.children[0]).toMatchObject({
        type: "section",
        layout: type.toLowerCase(),
      });
      const slack = JSON.stringify(cardToSlackBlocks(card as never));
      const teams = JSON.stringify(cardToAdaptiveCard(card as never));
      for (const payload of [slack, teams]) {
        expect(payload).toContain("Deployment complete");
        expect(payload).toContain("https://example.com/project.png");
        expect(payload).toContain("approve");
        expect(payload).toContain("project");
      }
    },
  );

  it("repeats carousel items and prunes incomplete item types while streaming", () => {
    const spec = specWith("Carousel");
    spec.state = { projects: [{ name: "Web" }, { name: "API" }] };
    spec.elements.content!.repeat = { statePath: "/projects" };
    spec.elements.content!.children = ["item"];
    spec.elements.item = {
      type: "Card",
      props: { title: { $item: "name" } },
      children: [],
    } as never;
    expect(JSON.stringify(toCard(spec))).toContain("Web");
    expect(JSON.stringify(toCard(spec))).toContain("API");
    spec.elements.bad = {
      type: "Text",
      props: { content: "not an item" },
      children: [],
    };
    spec.elements.content!.children!.push("bad");
    expect(() => toCard(spec)).toThrow(/only holds Section and Card/);
    expect(JSON.stringify(toPartialCard(spec))).not.toContain("not an item");
  });
});

describe("portable choices", () => {
  it.each(["Select", "RadioSelect"])(
    "routes %s IDs, values and initial selections through both adapters",
    (type) => {
      const spec = specWith("Actions");
      spec.elements.content!.children = ["choice"];
      spec.elements.choice = {
        type,
        props: {
          id: "environment",
          label: "Environment",
          initialOption: "prod",
          optional: true,
          options: [
            { label: "Production", value: "prod" },
            { label: "Preview", value: "preview" },
          ],
        },
        children: [],
      };
      const card = toCard(spec);
      const slack = JSON.stringify(cardToSlackBlocks(card as never));
      const teams = JSON.stringify(cardToAdaptiveCard(card as never));
      for (const payload of [slack, teams]) {
        expect(payload).toContain("environment");
        expect(payload).toContain("Production");
        expect(payload).toContain("prod");
        expect(payload).toContain("preview");
      }
      expect(slack).toContain(
        type === "Select" ? "static_select" : "radio_buttons",
      );
      expect(teams).toContain("Input.ChoiceSet");
    },
  );

  it("rejects duplicate option values and invalid initial selections", () => {
    const spec = specWith("Actions");
    spec.elements.content!.children = ["choice"];
    spec.elements.choice = {
      type: "Select",
      props: {
        id: "pick",
        label: "Pick",
        options: [
          { label: "A", value: "a" },
          { label: "B", value: "a" },
        ],
      },
      children: [],
    };
    expect(() => toCard(spec)).toThrow(/option values must be unique/);
    spec.elements.choice!.props = {
      id: "pick",
      label: "Pick",
      initialOption: "missing",
      options: [{ label: "A", value: "a" }],
    };
    expect(() => toCard(spec)).toThrow(/initialOption must match/);
  });
});

describe("task snapshots and feedback", () => {
  it("keeps status, details, output and feedback action values in native adapter output", () => {
    const spec = specWith("TaskList", { title: "Deployment" });
    spec.elements.content!.children = ["task"];
    spec.elements.task = {
      type: "Task",
      props: {
        title: "Build",
        status: "complete",
        details: "Compile assets",
        output: "Build passed",
      },
      children: [],
    };
    spec.elements.root!.children!.push("feedback", "link");
    spec.elements.feedback = {
      type: "Feedback",
      props: { id: "rating", label: "Helpful?" },
      children: [],
    };
    spec.elements.link = {
      type: "Link",
      props: { label: "Build log", url: "https://example.com/build" },
      children: [],
    };
    const card = toCard(spec);
    const slack = JSON.stringify(cardToSlackBlocks(card as never));
    const teams = JSON.stringify(cardToAdaptiveCard(card as never));
    for (const payload of [slack, teams]) {
      for (const value of [
        "Complete",
        "Compile assets",
        "Build passed",
        "rating:positive",
        "rating:negative",
        "https://example.com/build",
      ])
        expect(payload).toContain(value);
    }
  });

  it("omits empty task lists, but keeps a titled empty list", () => {
    const spec = specWith("TaskList");
    expect(toCard(spec).children).toEqual([]);
    spec.elements.content!.props = { title: "Deployment" };
    expect(toCard(spec).children).toHaveLength(1);
    spec.elements.content!.children = ["bad"];
    spec.elements.bad = {
      type: "Text",
      props: { content: "not a task" },
      children: [],
    };
    expect(() => toCard(spec)).toThrow(CardSpecError);
  });
});

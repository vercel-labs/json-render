import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { z } from "zod";
import type { Spec } from "@json-render/core";
import { defineDirective, resolvePropValue } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRenderProps,
} from "./renderer";

function Stack({ children }: ComponentRenderProps) {
  return <div data-testid="stack">{children}</div>;
}

function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
  return <span data-testid="text">{String(element.props.text)}</span>;
}

const registry = { Stack, Text };

const tasks = [
  { id: "1", title: "Auth flow", status: "todo" },
  { id: "2", title: "Push notifications", status: "in-progress" },
  { id: "3", title: "Dark mode", status: "todo" },
  { id: "4", title: "App icon", status: "done" },
];

function mount(spec: Spec) {
  return render(
    <JSONUIProvider registry={registry} initialState={spec.state ?? {}}>
      <Renderer spec={spec} registry={registry} />
    </JSONUIProvider>,
  );
}

describe("repeat with $item visible on the container (filtered list)", () => {
  it("renders only the items matching the filter", () => {
    mount({
      root: "column",
      state: { tasks },
      elements: {
        column: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/tasks", key: "id" },
          visible: { $item: "status", eq: "todo" },
          children: ["card"],
        },
        card: {
          type: "Text",
          props: { text: { $item: "title" } },
          children: [],
        },
      },
    });
    const texts = screen.getAllByTestId("text").map((n) => n.textContent);
    expect(texts).toEqual(["Auth flow", "Dark mode"]);
  });

  it("renders every item without a filter", () => {
    mount({
      root: "column",
      state: { tasks },
      elements: {
        column: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/tasks", key: "id" },
          children: ["card"],
        },
        card: {
          type: "Text",
          props: { text: { $item: "title" } },
          children: [],
        },
      },
    });
    expect(screen.getAllByTestId("text")).toHaveLength(4);
  });

  it("still hides the whole list for a container-level $state condition", () => {
    mount({
      root: "column",
      state: { tasks, showTasks: false },
      elements: {
        column: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/tasks", key: "id" },
          visible: { $state: "/showTasks", eq: true },
          children: ["card"],
        },
        card: {
          type: "Text",
          props: { text: { $item: "title" } },
          children: [],
        },
      },
    });
    expect(screen.queryAllByTestId("text")).toHaveLength(0);
  });

  it("keeps per-child $item visible working inside the repeat scope", () => {
    mount({
      root: "column",
      state: { tasks },
      elements: {
        column: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/tasks", key: "id" },
          children: ["card"],
        },
        card: {
          type: "Text",
          props: { text: { $item: "title" } },
          visible: { $item: "status", eq: "done" },
          children: [],
        },
      },
    });
    const texts = screen.getAllByTestId("text").map((n) => n.textContent);
    expect(texts).toEqual(["App icon"]);
  });
});

describe("mixed container/item visibility on repeat containers", () => {
  const mixedSpec = (showTasks: boolean): Spec => ({
    root: "column",
    state: { tasks, showTasks },
    elements: {
      column: {
        type: "Stack",
        props: {},
        repeat: { statePath: "/tasks", key: "id" },
        visible: {
          $and: [
            { $state: "/showTasks", eq: true },
            { $item: "status", eq: "todo" },
          ],
        },
        children: ["card"],
      },
      card: {
        type: "Text",
        props: { text: { $item: "title" } },
        children: [],
      },
    },
  });

  it("hides the container shell when the $state gate is false", () => {
    mount(mixedSpec(false));
    expect(screen.queryAllByTestId("stack")).toHaveLength(0);
    expect(screen.queryAllByTestId("text")).toHaveLength(0);
  });

  it("filters items when the $state gate is true", () => {
    mount(mixedSpec(true));
    expect(screen.getAllByTestId("stack")).toHaveLength(1);
    const texts = screen.getAllByTestId("text").map((n) => n.textContent);
    expect(texts).toEqual(["Auth flow", "Dark mode"]);
  });
});

describe("repeat container filter with $value", () => {
  it("resolves custom directives that read $item", () => {
    const lowerDirective = defineDirective({
      name: "$lower",
      schema: z.object({ $lower: z.unknown() }),
      resolve(value, ctx) {
        return String(resolvePropValue(value.$lower, ctx)).toLowerCase();
      },
    });
    const spec: Spec = {
      root: "column",
      state: {
        tasks: tasks.map((t) => ({ ...t, status: t.status.toUpperCase() })),
      },
      elements: {
        column: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/tasks", key: "id" },
          visible: { $value: { $lower: { $item: "status" } }, eq: "todo" },
          children: ["card"],
        },
        card: {
          type: "Text",
          props: { text: { $item: "title" } },
          children: [],
        },
      },
    };
    render(
      <JSONUIProvider
        registry={registry}
        initialState={spec.state ?? {}}
        directives={[lowerDirective]}
      >
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>,
    );
    const texts = screen.getAllByTestId("text").map((n) => n.textContent);
    expect(texts).toEqual(["Auth flow", "Dark mode"]);
  });
});

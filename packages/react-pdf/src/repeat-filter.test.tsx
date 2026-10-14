// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import {
  Document,
  Page,
  Text as PdfText,
  View,
  renderToBuffer as pdfRenderToBuffer,
} from "@react-pdf/renderer";
import type { Spec } from "@json-render/core";
import { renderToBuffer } from "./render";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRenderProps,
} from "./renderer";

let drawn: string[] = [];

function Doc({ children }: ComponentRenderProps) {
  return (
    <Document>
      <Page>{children}</Page>
    </Document>
  );
}

function Stack({ children }: ComponentRenderProps) {
  return <View>{children}</View>;
}

function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
  const text = String(element.props.text);
  drawn.push(text);
  return <PdfText>{text}</PdfText>;
}

const registry = { Doc, Stack, Text };

const tasks = [
  { id: "1", title: "Auth flow", status: "todo" },
  { id: "2", title: "Push notifications", status: "in-progress" },
  { id: "3", title: "Dark mode", status: "todo" },
  { id: "4", title: "App icon", status: "done" },
];

function listSpec(
  visible: Spec["elements"][string]["visible"],
  state: Record<string, unknown> = { tasks },
): Spec {
  return {
    root: "doc",
    state,
    elements: {
      doc: { type: "Doc", props: {}, children: ["list"] },
      list: {
        type: "Stack",
        props: {},
        repeat: { statePath: "/tasks", key: "id" },
        visible,
        children: ["card"],
      },
      card: {
        type: "Text",
        props: { text: { $item: "title" } },
        children: [],
      },
    },
  };
}

async function drawServerWalk(spec: Spec): Promise<string[]> {
  drawn = [];
  await renderToBuffer(spec, { registry, includeStandard: false });
  return drawn;
}

async function drawProviderRenderer(spec: Spec): Promise<string[]> {
  drawn = [];
  await pdfRenderToBuffer(
    <JSONUIProvider initialState={spec.state ?? {}}>
      <Renderer spec={spec} registry={registry} includeStandard={false} />
    </JSONUIProvider>,
  );
  return drawn;
}

describe.each([
  ["renderToBuffer", drawServerWalk],
  ["Renderer", drawProviderRenderer],
])("%s: $item visible on a repeat container", (_name, draw) => {
  beforeEach(() => {
    drawn = [];
  });

  it("draws only the items that match the filter", async () => {
    expect(await draw(listSpec({ $item: "status", eq: "todo" }))).toEqual([
      "Auth flow",
      "Dark mode",
    ]);
  });

  it("draws every item without a filter", async () => {
    expect(await draw(listSpec(undefined))).toEqual([
      "Auth flow",
      "Push notifications",
      "Dark mode",
      "App icon",
    ]);
  });

  it("filters on $index", async () => {
    expect(await draw(listSpec({ $index: true, lt: 2 }))).toEqual([
      "Auth flow",
      "Push notifications",
    ]);
  });

  it("uses $state conjuncts as a container gate", async () => {
    const visible = [{ $state: "/showList" }, { $item: "status", eq: "todo" }];
    expect(await draw(listSpec(visible, { tasks, showList: true }))).toEqual([
      "Auth flow",
      "Dark mode",
    ]);
    expect(await draw(listSpec(visible, { tasks, showList: false }))).toEqual(
      [],
    );
  });

  it("keeps the original index of each item", async () => {
    const spec = listSpec({ $item: "status", eq: "todo" });
    spec.elements.card!.props = { text: { $index: true } };
    expect(await draw(spec)).toEqual(["0", "2"]);
  });
});

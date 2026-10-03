// @vitest-environment node
import { describe, it, expect } from "vitest";
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

function Section({
  element,
  children,
}: ComponentRenderProps<{ title: string }>) {
  drawn.push(`[${element.props.title}]`);
  return (
    <View>
      <PdfText>{element.props.title}</PdfText>
      {children}
    </View>
  );
}

function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
  const text = String(element.props.text);
  drawn.push(text);
  return <PdfText>{text}</PdfText>;
}

const registry = { Doc, Section, Text };

const appendixSpec: Spec = {
  root: "doc",
  state: {
    domains: [
      {
        name: "Identity",
        tasks: [{ title: "Enforce MFA" }, { title: "Review admins" }],
      },
      { name: "Network", tasks: [{ title: "Patch firewall" }] },
      { name: "Data", tasks: [] },
    ],
  },
  elements: {
    doc: { type: "Doc", props: {}, children: ["appendix"] },
    appendix: {
      type: "Section",
      props: { title: "Appendix B" },
      repeat: { statePath: "/domains", key: "name" },
      children: ["domainName", "tasks"],
    },
    domainName: {
      type: "Text",
      props: { text: { $item: "name" } },
    },
    tasks: {
      type: "Section",
      props: { title: "Tasks" },
      repeat: { statePath: { $item: "tasks" } },
      children: ["task"],
    },
    task: {
      type: "Text",
      props: { text: { $item: "title" } },
    },
  },
};

const expected = [
  "[Appendix B]",
  "Identity",
  "[Tasks]",
  "Enforce MFA",
  "Review admins",
  "Network",
  "[Tasks]",
  "Patch firewall",
  "Data",
  "[Tasks]",
];

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
])("%s: repeat containers", (_name, draw) => {
  it("draws each repeat container once, with its items in order", async () => {
    expect(await draw(appendixSpec)).toEqual(expected);
  });

  it("draws an empty repeat container once", async () => {
    const spec: Spec = {
      ...appendixSpec,
      state: { domains: [] },
    };
    expect(await draw(spec)).toEqual(["[Appendix B]"]);
  });
});

import { describe, it, expect } from "vitest";
import React from "react";
import { Text } from "@react-pdf/renderer";
import { z } from "zod";
import type { Spec } from "@json-render/core";
import { defineDirective, resolvePropValue } from "@json-render/core";
import { renderToBuffer } from "./render";

const upperDirective = defineDirective({
  name: "$upper",
  schema: z.object({ $upper: z.unknown() }),
  resolve(value, ctx) {
    const resolved = resolvePropValue(value.$upper, ctx);
    return String(resolved).toUpperCase();
  },
});

function createProbe() {
  const seen: unknown[] = [];
  function Probe({ element }: { element: { props: { text: unknown } } }) {
    seen.push(element.props.text);
    return <Text>{String(element.props.text)}</Text>;
  }
  return { seen, Probe };
}

function documentSpec(
  children: Spec["elements"],
  state?: Record<string, unknown>,
): Spec {
  return {
    root: "doc",
    elements: {
      doc: { type: "Document", props: {}, children: ["page"] },
      page: { type: "Page", props: {}, children: ["body"] },
      ...children,
    },
    state,
  };
}

describe("renderToBuffer with functions and directives", () => {
  it("resolves $computed, directives, and a directive wrapping $computed", async () => {
    const { seen, Probe } = createProbe();
    const spec = documentSpec({
      body: { type: "View", props: {}, children: ["a", "b", "c"] },
      a: {
        type: "Probe",
        props: {
          text: { $computed: "fullName", args: { first: { $state: "/n" } } },
        },
        children: [],
      },
      b: { type: "Probe", props: { text: { $upper: "hello" } }, children: [] },
      c: {
        type: "Probe",
        props: { text: { $upper: { $computed: "greet" } } },
        children: [],
      },
    });

    const buffer = await renderToBuffer(spec, {
      registry: { Probe },
      state: { n: "Ada" },
      functions: {
        fullName: ({ first }) => `${first} Lovelace`,
        greet: () => "hi there",
      },
      directives: [upperDirective],
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(seen).toEqual(["Ada Lovelace", "HELLO", "HI THERE"]);
  });

  it("resolves $computed with $item args per repeat iteration", async () => {
    const { seen, Probe } = createProbe();
    const spec = documentSpec(
      {
        body: {
          type: "View",
          props: {},
          repeat: { statePath: "/items" },
          children: ["item"],
        },
        item: {
          type: "Probe",
          props: {
            text: { $computed: "label", args: { name: { $item: "name" } } },
          },
          children: [],
        },
      },
      { items: [{ name: "a" }, { name: "b" }] },
    );

    await renderToBuffer(spec, {
      registry: { Probe },
      functions: { label: ({ name }) => `item-${name}` },
    });

    expect(seen).toEqual(["item-a", "item-b"]);
  });
});

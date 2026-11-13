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

function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
  const value = element.props.text;
  return <span data-testid="text">{value == null ? "" : String(value)}</span>;
}

function List({ children }: ComponentRenderProps) {
  return <div>{children}</div>;
}

const registry = { Text, List };

const upperDirective = defineDirective({
  name: "$upper",
  schema: z.object({ $upper: z.unknown() }),
  resolve(value, ctx) {
    const resolved = resolvePropValue(value.$upper, ctx);
    return String(resolved).toUpperCase();
  },
});

function textSpec(text: unknown, state?: Record<string, unknown>): Spec {
  return {
    root: "main",
    elements: {
      main: { type: "Text", props: { text }, children: [] },
    },
    state,
  };
}

describe("$computed and directives in react-pdf renderer", () => {
  it("resolves a $computed prop using provided functions", () => {
    const spec = textSpec(
      { $computed: "fullName", args: { first: { $state: "/first" } } },
      { first: "Ada" },
    );

    render(
      <JSONUIProvider
        registry={registry}
        initialState={spec.state}
        functions={{ fullName: ({ first }) => `${first} Lovelace` }}
      >
        <Renderer spec={spec} registry={registry} includeStandard={false} />
      </JSONUIProvider>,
    );

    expect(screen.getByTestId("text").textContent).toBe("Ada Lovelace");
  });

  it("resolves a custom directive", () => {
    const spec = textSpec({ $upper: "hello" });

    render(
      <JSONUIProvider registry={registry} directives={[upperDirective]}>
        <Renderer spec={spec} registry={registry} includeStandard={false} />
      </JSONUIProvider>,
    );

    expect(screen.getByTestId("text").textContent).toBe("HELLO");
  });

  it("resolves a directive wrapping a $computed expression", () => {
    const spec = textSpec({ $upper: { $computed: "greet" } });

    render(
      <JSONUIProvider
        registry={registry}
        functions={{ greet: () => "hi there" }}
        directives={[upperDirective]}
      >
        <Renderer spec={spec} registry={registry} includeStandard={false} />
      </JSONUIProvider>,
    );

    expect(screen.getByTestId("text").textContent).toBe("HI THERE");
  });

  it("resolves $computed with $item args per repeat iteration", () => {
    const spec: Spec = {
      root: "list",
      state: { items: [{ name: "a" }, { name: "b" }] },
      elements: {
        list: {
          type: "List",
          props: {},
          repeat: { statePath: "/items" },
          children: ["item"],
        },
        item: {
          type: "Text",
          props: {
            text: { $computed: "label", args: { name: { $item: "name" } } },
          },
          children: [],
        },
      },
    };

    render(
      <JSONUIProvider
        registry={registry}
        initialState={spec.state}
        functions={{ label: ({ name }) => `item-${name}` }}
      >
        <Renderer spec={spec} registry={registry} includeStandard={false} />
      </JSONUIProvider>,
    );

    expect(screen.getAllByTestId("text").map((el) => el.textContent)).toEqual([
      "item-a",
      "item-b",
    ]);
  });
});

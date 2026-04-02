import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import type { Spec } from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRenderProps,
} from "./renderer";

describe("Renderer", () => {
  it("renders null for null spec", () => {
    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
    });
    expect(element).toBeDefined();
    expect(element.props.spec).toBeNull();
  });

  it("renders null for spec without root", () => {
    const element = React.createElement(Renderer, {
      spec: { root: "", elements: {} },
      registry: {},
    });
    expect(element).toBeDefined();
  });

  it("accepts loading prop", () => {
    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
      loading: true,
    });
    expect(element.props.loading).toBe(true);
  });

  it("accepts fallback prop", () => {
    const Fallback = () =>
      React.createElement("div", null, "Unknown component");

    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
      fallback: Fallback,
    });
    expect(element.props.fallback).toBe(Fallback);
  });

  it("resolves nested repeat statePath from parent $item scope", () => {
    function Group({ children }: ComponentRenderProps) {
      return <div>{children}</div>;
    }

    function Text({ element }: ComponentRenderProps<{ text: unknown }>) {
      return <span data-testid="item-text">{String(element.props.text)}</span>;
    }

    const spec: Spec = {
      root: "groups",
      state: {
        groups: [
          { subitems: [{ label: "a1" }, { label: "a2" }] },
          { subitems: [{ label: "b1" }] },
        ],
      },
      elements: {
        groups: {
          type: "Group",
          props: {},
          repeat: { statePath: "/groups" },
          children: ["subitems"],
        },
        subitems: {
          type: "Group",
          props: {},
          repeat: { statePath: { $item: "subitems" } },
          children: ["label"],
        },
        label: {
          type: "Text",
          props: { text: { $item: "label" } },
        },
      },
    };

    render(
      <JSONUIProvider registry={{ Group, Text }} initialState={spec.state}>
        <Renderer spec={spec} registry={{ Group, Text }} />
      </JSONUIProvider>,
    );

    expect(
      screen.getAllByTestId("item-text").map((el) => el.textContent),
    ).toEqual(["a1", "a2", "b1"]);
  });
});

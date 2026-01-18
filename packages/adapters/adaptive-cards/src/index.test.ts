import { describe, it, expect } from "vitest";
import { UITree } from "@json-render/core";
import { renderAdaptiveCard, AdaptiveCardRegistry, createActionSubmit } from "./index";

describe("renderAdaptiveCard", () => {
  it("should render a simple tree to Adaptive Card", () => {
    const tree: UITree = {
      root: "root",
      elements: {
        root: {
          key: "root",
          type: "Card",
          props: { title: "Test Card" },
          children: ["child1"]
        },
        child1: {
          key: "child1",
          type: "Text",
          props: { content: "Hello World" }
        }
      }
    };

    const registry: AdaptiveCardRegistry = {
      Card: (element, children) => ({
        type: "Container",
        items: [
          { type: "TextBlock", text: element.props.title, weight: "Bolder" },
          ...children
        ]
      }),
      Text: (element) => ({
        type: "TextBlock",
        text: element.props.content
      })
    };

    const result = renderAdaptiveCard(tree, registry);

    expect(result).toEqual({
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "Container",
          items: [
            { type: "TextBlock", text: "Test Card", weight: "Bolder" },
            { type: "TextBlock", text: "Hello World" }
          ]
        }
      ]
    });
  });

  it("should handle actions", () => {
    const tree: UITree = {
      root: "btn",
      elements: {
        btn: {
          key: "btn",
          type: "Button",
          props: { label: "Click Me", action: { name: "click" } }
        }
      }
    };

    const registry: AdaptiveCardRegistry = {
      Button: (element) => createActionSubmit(element.props.label, element.props.action)
    };

    const result = renderAdaptiveCard(tree, registry);

    // Note: renderAdaptiveCard wraps root elements in body.
    // If root element is Action.Submit, it might not be valid inside body directly without ActionSet,
    // but the adapter blindly puts it there.
    // Adaptive Cards schema requires Actions to be in 'actions' or 'ActionSet'.
    // But let's verify the adapter output matches what we expect.

    expect(result).toEqual({
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "Action.Submit",
          title: "Click Me",
          data: { name: "click" }
        }
      ]
    });
  });

  it("should handle fragments (array of elements from component)", () => {
    const tree: UITree = {
      root: "root",
      elements: {
        root: { key: "root", type: "Container", children: ["fields"] },
        fields: { key: "fields", type: "Fields", props: {} }
      }
    };

    const registry: AdaptiveCardRegistry = {
      Container: (element, children) => ({
        type: "Container",
        items: children
      }),
      Fields: () => [
        { type: "Input.Text", id: "f1" },
        { type: "Input.Text", id: "f2" }
      ]
    };

    const result = renderAdaptiveCard(tree, registry);

    expect(result).toMatchObject({
      body: [
        {
          type: "Container",
          items: [
            { type: "Input.Text", id: "f1" },
            { type: "Input.Text", id: "f2" }
          ]
        }
      ]
    });
  });
});

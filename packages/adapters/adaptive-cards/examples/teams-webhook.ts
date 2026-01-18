import { UITree } from "@json-render/core";
import { renderAdaptiveCard, AdaptiveCardRegistry, createActionSubmit } from "../src";

const tree: UITree = {
  root: "root",
  elements: {
    root: {
      key: "root",
      type: "Card",
      props: { title: "Daily Report" },
      children: ["metric1", "button1"]
    },
    metric1: {
      key: "metric1",
      type: "Metric",
      props: { label: "Revenue", value: "$10,000" }
    },
    button1: {
      key: "button1",
      type: "Button",
      props: { label: "Approve", action: { name: "approve", params: { id: "123" } } }
    }
  }
};

const registry: AdaptiveCardRegistry = {
  Card: (element, children) => ({
    type: "Container",
    items: [
      {
        type: "TextBlock",
        text: element.props.title,
        size: "Large",
        weight: "Bolder"
      },
      ...children
    ]
  }),
  Metric: (element) => ({
    type: "FactSet",
    facts: [
      { title: element.props.label, value: element.props.value }
    ]
  }),
  Button: (element) => ({
    type: "ActionSet",
    actions: [
      createActionSubmit(element.props.label, element.props.action)
    ]
  })
};

const card = renderAdaptiveCard(tree, registry);

// Output the card JSON
// This JSON can be sent to a Teams Incoming Webhook or used in Bot Framework
console.log(JSON.stringify(card, null, 2));

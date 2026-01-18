import { UIElement, UITree } from "@json-render/core";

export type AdaptiveCardElement = Record<string, unknown>;

export type AdaptiveCardNode = AdaptiveCardElement | AdaptiveCardElement[];

export type AdaptiveCardComponent<P = any> = (
  element: UIElement<string, P>,
  children: AdaptiveCardElement[]
) => AdaptiveCardNode;

export type AdaptiveCardRegistry = Record<string, AdaptiveCardComponent>;

export interface AdaptiveCardOptions {
  version?: string;
  fallbackText?: string;
}

function renderElement(
  key: string,
  tree: UITree,
  registry: AdaptiveCardRegistry
): AdaptiveCardElement[] {
  const element = tree.elements[key];
  if (!element) {
    return [];
  }

  const component = registry[element.type];
  if (!component) {
    // If component is not found, return a warning TextBlock or just skip?
    // Returning a warning is safer for debugging.
    return [{
      type: "TextBlock",
      text: `[Unknown component: ${element.type}]`,
      color: "Attention",
      wrap: true
    }];
  }

  // Recursively render children
  const children: AdaptiveCardElement[] = [];
  if (element.children) {
    for (const childKey of element.children) {
      children.push(...renderElement(childKey, tree, registry));
    }
  }

  const result = component(element, children);
  return Array.isArray(result) ? result : [result];
}

export function renderAdaptiveCard(
  tree: UITree,
  registry: AdaptiveCardRegistry,
  options: AdaptiveCardOptions = {}
): AdaptiveCardElement {
  const rootElements = renderElement(tree.root, tree, registry);

  return {
    type: "AdaptiveCard",
    version: options.version || "1.5",
    body: rootElements,
    fallbackText: options.fallbackText,
  };
}

/**
 * Helper to create an Action.Submit
 */
export function createActionSubmit(title: string, data: unknown): AdaptiveCardElement {
  return {
    type: "Action.Submit",
    title,
    data,
  };
}

/**
 * Helper to create an Action.Execute (for Adaptive Cards 1.4+)
 */
export function createActionExecute(title: string, verb: string, data: unknown): AdaptiveCardElement {
  return {
    type: "Action.Execute",
    title,
    verb,
    data,
  };
}

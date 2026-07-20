import {
  SPEC_DATA_PART_TYPE,
  applySpecPatch,
  nestedToFlat,
} from "@json-render/core";
import type {
  FlatElement,
  Spec,
  SpecDataPart,
  UIElement,
} from "@json-render/core";

/** Token usage metadata from AI generation. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * A single part from the AI SDK's `message.parts` array. Minimal structural type
 * so library helpers do not depend on the AI SDK.
 */
export interface DataPart {
  type: string;
  text?: string;
  data?: unknown;
}

/**
 * Convert a flat element list to a {@link Spec}. Input elements use
 * `key`/`parentKey` to establish identity and relationships; output uses the
 * map-based format with children arrays.
 */
export function flatToTree(elements: FlatElement[]): Spec {
  const elementMap: Record<string, UIElement> = {};
  let root = "";

  for (const element of elements) {
    elementMap[element.key] = {
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible,
    };
  }

  for (const element of elements) {
    if (element.parentKey) {
      const parent = elementMap[element.parentKey];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(element.key);
      }
    } else {
      root = element.key;
    }
  }

  return { root, elements: elementMap };
}

function isSpecDataPart(data: unknown): data is SpecDataPart {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  switch (obj["type"]) {
    case "patch":
      return typeof obj["patch"] === "object" && obj["patch"] !== null;
    case "flat":
    case "nested":
      return typeof obj["spec"] === "object" && obj["spec"] !== null;
    default:
      return false;
  }
}

/**
 * Build a {@link Spec} by replaying all spec data parts from a message's parts
 * array. Returns `null` if none are present. No AI SDK dependency — operates on
 * a generic `{ type, data }[]`.
 */
export function buildSpecFromParts(parts: DataPart[]): Spec | null {
  const spec: Spec = { root: "", elements: {} };
  let hasSpec = false;

  for (const part of parts) {
    if (part.type === SPEC_DATA_PART_TYPE) {
      if (!isSpecDataPart(part.data)) continue;
      const payload = part.data;
      if (payload.type === "patch") {
        hasSpec = true;
        applySpecPatch(spec, payload.patch);
      } else if (payload.type === "flat") {
        hasSpec = true;
        Object.assign(spec, payload.spec);
      } else if (payload.type === "nested") {
        hasSpec = true;
        const flat = nestedToFlat(payload.spec);
        Object.assign(spec, flat);
      }
    }
  }

  return hasSpec ? spec : null;
}

/**
 * Extract and join all text content from a message's parts array (parts with
 * `type === "text"`), joined with double newlines. No AI SDK dependency.
 */
export function getTextFromParts(parts: DataPart[]): string {
  return parts
    .filter(
      (p): p is DataPart & { text: string } =>
        p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

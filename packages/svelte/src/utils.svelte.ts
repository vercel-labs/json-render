import type {
  Spec,
  UIElement,
  FlatElement,
  SpecDataPart,
} from "@json-render/core";
import {
  applySpecPatch,
  nestedToFlat,
  SPEC_DATA_PART_TYPE,
} from "@json-render/core";

/**
 * A single part from an AI response. Minimal structural type for library helpers.
 */
export interface DataPart {
  type: string;
  text?: string;
  data?: unknown;
}

/**
 * Convert a flat element list to a Spec.
 * Input elements use key/parentKey to establish identity and relationships.
 * Output spec uses the map-based format where key is the map entry key
 * and parent-child relationships are expressed through children arrays.
 */
export function flatToTree(elements: FlatElement[]): Spec {
  const elementMap: Record<string, UIElement> = {};
  let root = "";

  // First pass: add all elements to map
  for (const element of elements) {
    elementMap[element.key] = {
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible,
    };
  }

  // Second pass: build parent-child relationships
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

/**
 * Type guard that validates a data part payload looks like a valid SpecDataPart.
 */
function isSpecDataPart(data: unknown): data is SpecDataPart {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  switch (obj.type) {
    case "patch":
      return typeof obj.patch === "object" && obj.patch !== null;
    case "flat":
    case "nested":
      return typeof obj.spec === "object" && obj.spec !== null;
    default:
      return false;
  }
}

/**
 * Build a `Spec` by replaying all spec data parts from a message's parts array.
 * Returns `null` if no spec data parts are present.
 */
export function buildSpecFromParts(
  parts: DataPart[],
  snapshot = true,
): Spec | null {
  const spec: Spec = { root: "", elements: {} };
  let hasSpec = false;

  for (const part of parts) {
    if (part.type === SPEC_DATA_PART_TYPE) {
      if (!isSpecDataPart(part.data)) continue;
      const payload = part.data;
      if (payload.type === "patch") {
        hasSpec = true;
        applySpecPatch(
          spec,
          snapshot ? $state.snapshot(payload.patch) : payload.patch,
        );
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
 * Extract and join all text content from a message's parts array.
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

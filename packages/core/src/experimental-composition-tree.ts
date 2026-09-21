import { z } from "zod";
import type { Spec, UIElement } from "./types";
import type { Experimental_CompositionCatalog } from "./experimental-compose";

// Check the untrusted seed before traversing it. Recipes and resolved values
// receive the same catalog validation as newly composed elements.
const seedSchema = z
  .object({
    root: z.string().min(1),
    elements: z.record(
      z.string(),
      z
        .object({
          type: z.string(),
          props: z.record(z.string(), z.unknown()),
          children: z.array(z.string()).optional(),
          slots: z.record(z.string(), z.array(z.string())).optional(),
          on: z.record(z.string(), z.unknown()).optional(),
          visible: z.unknown().optional(),
        })
        .strict(),
    ),
    state: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export function cloneInitialSpec(value: Spec): Spec {
  if (!seedSchema.safeParse(value).success)
    throw new Error(
      "initialSpec must be a flat Spec without repeats or watchers.",
    );
  return structuredClone(value);
}

export function atomicElement(element: UIElement) {
  return {
    type: element.type,
    props: element.props,
    ...(element.on === undefined ? {} : { on: element.on }),
    ...(element.visible === undefined ? {} : { visible: element.visible }),
  };
}

/** Compare JSON recipes regardless of object-key order. Never shared with the model. */
export function recipeKey(value: unknown): string {
  return JSON.stringify(value, (_key, child) =>
    child && typeof child === "object" && !Array.isArray(child)
      ? Object.fromEntries(
          Object.entries(child).sort(([a], [b]) => a.localeCompare(b)),
        )
      : child,
  );
}

export interface Attachment {
  id: string;
  slot: string;
}

export interface TreePosition {
  depth: number;
  parent?: Attachment;
}

export function childrenAt(element: UIElement, slot: string): string[] {
  return slot === "default"
    ? (element.children ?? [])
    : element.slots && Object.hasOwn(element.slots, slot)
      ? element.slots[slot]!
      : [];
}

/** Require a tree: no cycles, shared nodes, dangling edges, or unreachable nodes. */
export function indexTree(
  spec: Spec,
  catalog: Experimental_CompositionCatalog,
  maxDepth: number,
) {
  const positions = new Map<string, TreePosition>();
  function visit(id: string, depth: number, parent?: Attachment) {
    if (!Object.hasOwn(spec.elements, id))
      throw new Error("Spec references a missing element.");
    if (positions.has(id))
      throw new Error("Spec must be a tree without cycles or shared children.");
    if (depth > maxDepth) throw new Error("Spec exceeds maxDepth.");
    positions.set(id, { depth, parent });
    const element = spec.elements[id]!;
    if (element.slots && Object.hasOwn(element.slots, "default"))
      throw new Error("Use children for the default slot.");
    const slots = catalog.data.components[element.type]?.slots ?? [];
    for (const [slot, children] of [
      ["default", element.children ?? []],
      ...Object.entries(element.slots ?? {}),
    ] as [string, string[]][]) {
      if (children.length && !slots.includes(slot))
        throw new Error(
          `Component ${element.type} does not support slot ${slot}.`,
        );
      for (const child of children) visit(child, depth + 1, { id, slot });
    }
  }
  if (spec.root) visit(spec.root, 1);
  if (positions.size !== Object.keys(spec.elements).length)
    throw new Error("Spec contains unreachable elements.");
  return positions;
}

export function subtreeIds(spec: Spec, id: string): string[] {
  const element = spec.elements[id]!;
  return [
    id,
    ...[
      ...(element.children ?? []),
      ...Object.values(element.slots ?? {}).flat(),
    ].flatMap((child) => subtreeIds(spec, child)),
  ];
}

export function detach(spec: Spec, id: string, parent: Attachment) {
  const children = childrenAt(spec.elements[parent.id]!, parent.slot);
  children.splice(children.indexOf(id), 1);
}

export function attach(
  spec: Spec,
  id: string,
  parent: Attachment,
  before?: string,
) {
  const container = spec.elements[parent.id]!;
  if (parent.slot === "default") container.children ??= [];
  else {
    container.slots ??= {};
    if (!Object.hasOwn(container.slots, parent.slot))
      Object.defineProperty(container.slots, parent.slot, {
        value: [],
        enumerable: true,
        writable: true,
        configurable: true,
      });
  }
  const children = childrenAt(container, parent.slot);
  children.splice(
    before === undefined ? children.length : children.indexOf(before),
    0,
    id,
  );
}

export function canReplace(
  element: UIElement,
  type: string,
  catalog: Experimental_CompositionCatalog,
) {
  const slots = catalog.data.components[type]?.slots ?? [];
  return (
    (!element.children?.length || slots.includes("default")) &&
    Object.entries(element.slots ?? {}).every(
      ([slot, children]) => !children.length || slots.includes(slot),
    )
  );
}

export function replaceElement(
  spec: Spec,
  id: string,
  recipe: UIElement,
  catalog: Experimental_CompositionCatalog,
) {
  const previous = spec.elements[id]!;
  const slots = catalog.data.components[recipe.type]?.slots ?? [];
  spec.elements[id] = {
    ...structuredClone(recipe),
    children: previous.children ?? [],
    ...(previous.slots
      ? {
          slots: Object.fromEntries(
            Object.entries(previous.slots).filter(([slot]) =>
              slots.includes(slot),
            ),
          ),
        }
      : {}),
  };
}

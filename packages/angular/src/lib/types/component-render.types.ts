import type { Type } from "@angular/core";
import type { UIElement } from "@json-render/core";

import type { EventHandle } from "./catalog-types";

/**
 * Maps element type names (catalog component keys) to Angular component classes.
 */
export type ComponentRegistry = Record<string, Type<unknown>>;

/**
 * Interface a renderable Angular component may implement. The renderer sets
 * every field via `ComponentRef.setInput()`, so components declare matching
 * `input()`s. Implementing the full interface is optional — components only need
 * the inputs they actually use.
 */
export interface JsonRenderComponent<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}

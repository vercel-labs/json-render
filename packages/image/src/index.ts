// Schema
export { schema, type ImageSchema, type ImageSpec } from "./schema";

// Core types (re-exported for convenience)
export type { Spec } from "@json-render/core";

// Catalog-aware types
export type {
  SetState,
  StateModel,
  ComponentContext,
  ComponentFn,
  Components,
} from "./catalog-types";

// Renderer types
export type {
  ComponentRenderProps,
  ComponentRenderer,
  ComponentRegistry,
} from "./types";

// Standard components
export { standardComponents } from "./components";

// Server-side render functions
export { renderToSvg, renderToPng, type RenderOptions } from "./render";

// Catalog definitions
export {
  standardComponentDefinitions,
  type StandardComponentDefinitions,
  type StandardComponentProps,
} from "./catalog";

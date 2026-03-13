// Schema
export { schema, type AstroSchema, type AstroSpec } from "./schema";

// Core types (re-exported for convenience)
export type { Spec } from "@json-render/core";
export { defineCatalog } from "@json-render/core";

// Catalog-aware types
export type {
  ComponentFn,
  Components,
  ComponentRenderProps,
  ComponentRenderer,
  ComponentRegistry,
} from "./catalog-types";

// SSR renderer
export { renderToHtml, escapeHtml, type RenderOptions } from "./render";

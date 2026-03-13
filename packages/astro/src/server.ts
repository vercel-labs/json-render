// Server-safe entry point: schema and catalog definitions only.
// No runtime rendering code.

export { schema, type AstroSchema, type AstroSpec } from "./schema";

export type { Spec } from "@json-render/core";
export { defineCatalog } from "@json-render/core";

export type {
  ComponentFn,
  Components,
  ComponentRenderProps,
  ComponentRenderer,
  ComponentRegistry,
} from "./catalog-types";

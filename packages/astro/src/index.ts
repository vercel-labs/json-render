// Schema
export { schema, type AstroSchema, type AstroSpec } from "./schema";

// Core re-exports
export type { Spec } from "@json-render/core";
export { defineCatalog } from "@json-render/core";

// Types
export type {
  AstroComponentRegistry,
  Components,
  StateModel,
} from "./catalog-types";

// Registry
export { defineRegistry, type DefineRegistryResult } from "./renderer";

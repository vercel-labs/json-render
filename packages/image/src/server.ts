// Server-safe entry point: schema and catalog definitions only.
// Does not import React or Satori.

export { schema, type ImageSchema, type ImageSpec } from "./schema";

export {
  standardComponentDefinitions,
  type StandardComponentDefinitions,
  type StandardComponentProps,
} from "./catalog";

export type { Spec } from "@json-render/core";

export type {
  SetState,
  StateModel,
  ComponentContext,
  ComponentFn,
  Components,
} from "./catalog-types";

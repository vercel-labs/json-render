// Server-safe entry point: schema and catalog definitions only.
// Uses `import type` for React types (erased at runtime — no React dependency).

export { schema, type InkSchema, type InkSpec } from "./schema";

export {
  standardComponentDefinitions,
  standardActionDefinitions,
  type ComponentDefinition,
  type ActionDefinition,
} from "./catalog";

export type { Spec } from "@json-render/core";

export type {
  SetState,
  StateModel,
  ComponentContext,
  ComponentFn,
  Components,
  ActionFn,
  Actions,
} from "./catalog-types";

import type { ReactNode } from "react";
import type {
  Catalog,
  InferCatalogComponents,
  InferComponentProps,
  StateModel,
} from "@json-render/core";

export type { StateModel };

// =============================================================================
// State Types
// =============================================================================

export type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

// =============================================================================
// Component Types
// =============================================================================

export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> {
  props: InferComponentProps<C, K>;
  children?: ReactNode;
  emit: (event: string) => void;
  bindings?: Record<string, string>;
  loading?: boolean;
}

export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = (ctx: ComponentContext<C, K>) => ReactNode;

export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: ComponentFn<C, K>;
};

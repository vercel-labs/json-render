import type {
  Catalog,
  InferCatalogComponents,
  InferComponentProps,
  StateModel,
} from "@json-render/core";

export type { StateModel };

export type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> {
  props: InferComponentProps<C, K>;
  children?: React.ReactNode;
  emit: (event: string) => void;
}

export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = (ctx: ComponentContext<C, K>) => React.ReactNode;

export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: ComponentFn<C, K>;
};

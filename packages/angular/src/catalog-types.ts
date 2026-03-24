import type {
  Catalog,
  InferActionParams,
  InferCatalogActions,
  InferCatalogComponents,
  InferComponentProps,
  StateModel,
} from "@json-render/core";
import type { VNode } from "./vnode";

export type { StateModel };

export interface EventHandle {
  emit: () => void | Promise<void>;
  shouldPreventDefault: boolean;
  bound: boolean;
}

export type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

export interface BaseComponentProps<P = Record<string, unknown>> {
  props: P;
  children?: VNode[];
  emit: (event: string) => void | Promise<void>;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}

export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> extends BaseComponentProps<InferComponentProps<C, K>> {}

export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = (ctx: ComponentContext<C, K>) => VNode | VNode[] | string | null;

export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: ComponentFn<C, K>;
};

export type ActionFn<
  C extends Catalog,
  K extends keyof InferCatalogActions<C>,
> = (
  params: InferActionParams<C, K> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

export type Actions<C extends Catalog> = {
  [K in keyof InferCatalogActions<C>]: ActionFn<C, K>;
};

export type CatalogHasActions<C extends Catalog> = [
  InferCatalogActions<C>,
] extends [never]
  ? false
  : [keyof InferCatalogActions<C>] extends [never]
    ? false
    : true;

import type { ComponentType, ReactNode } from "react";
import type { UIElement } from "@json-render/core";

export interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  children?: ReactNode;
  emit: (event: string) => void;
}

export type ComponentRenderer<P = Record<string, unknown>> = ComponentType<
  ComponentRenderProps<P>
>;

export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

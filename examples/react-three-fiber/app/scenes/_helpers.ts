import type { Spec } from "@json-render/core";

export type Scene = { name: string; description: string; spec: Spec };

export const PI = Math.PI;

export function range(n: number) {
  return Array.from({ length: n }, (_, i) => ({ i }));
}

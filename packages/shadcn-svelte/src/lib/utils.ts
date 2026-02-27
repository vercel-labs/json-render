import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Snippet } from "svelte";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility types for shadcn-svelte components
export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
  ref?: E | null;
};

// WithoutChild should only omit "child" (singular), not "children"
// children is the Svelte 5 snippet pattern, which is still used
export type WithoutChild<T> = Omit<T, "child"> & { children?: Snippet };

export type WithoutChildrenOrChild<T> = Omit<T, "children" | "child">;

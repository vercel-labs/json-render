"use client";

import { defineRegistry } from "@json-render/react";
import type { ComputedFunction } from "@json-render/core";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "./catalog";

let confettiListener: (() => void) | null = null;

export function onConfetti(cb: () => void) {
  confettiListener = cb;
  return () => {
    confettiListener = null;
  };
}

const cityData: Record<string, string[]> = {
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  UK: ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol"],
  Germany: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
  Japan: ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Sapporo"],
};

export const { registry } = defineRegistry(catalog, {
  components: {
    ...shadcnComponents,
  },
  actions: {
    confetti: async () => {
      confettiListener?.();
    },
  },
});

export const actionHandlers: Record<
  string,
  (params: Record<string, unknown>) => void
> = {
  confetti: () => confettiListener?.(),
};

export const computedFunctions: Record<string, ComputedFunction> = {
  formatAddress: (args) => {
    const city = (args.city as string) ?? "";
    const country = (args.country as string) ?? "";
    if (!city && !country) return "No location selected";
    if (!city) return country;
    return `${city}, ${country}`;
  },
  citiesForCountry: (args) => {
    const country = (args.country as string) ?? "";
    return cityData[country] ?? [];
  },
};

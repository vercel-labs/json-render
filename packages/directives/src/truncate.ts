import { z } from "zod";
import { defineDirective, resolvePropValue } from "@json-render/core";

export const truncateDirective = defineDirective({
  name: "$truncate",
  description: "Truncate text to a max length with a suffix.",
  schema: z.object({
    $truncate: z.unknown(),
    length: z.number().optional(),
    suffix: z.string().optional(),
  }),
  resolve(raw, ctx) {
    const resolved = resolvePropValue(raw.$truncate, ctx);
    const text = resolved != null ? String(resolved) : "";
    const maxLength = raw.length ?? 100;
    const suffix = raw.suffix ?? "...";

    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  },
});

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

    let limit = Math.trunc(maxLength) || 0;
    if (limit < 0) {
      // Negative slice limits are relative to the total code point count.
      let total = 0;
      for (const _ of text) total++;
      limit = Math.max(0, total + limit);
    }

    // Stop at the cutoff without allocating an array for the entire input.
    let end = 0;
    let count = 0;
    while (end < text.length && count < limit) {
      end += text.codePointAt(end)! > 0xffff ? 2 : 1;
      count++;
    }
    if (end === text.length && count <= maxLength) return text;
    return text.slice(0, end) + suffix;
  },
});

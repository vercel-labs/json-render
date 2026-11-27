import { z } from "zod";
import { defineDirective, resolvePropValue } from "@json-render/core";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function coerceDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year!, month! - 1, day!));
  }
  return new Date(value as string | number);
}

export const formatDirective = defineDirective({
  name: "$format",
  description:
    'Locale-aware value formatting (date, currency, number, percent). Supports style: "relative" for relative dates.',
  schema: z.object({
    $format: z.enum(["date", "currency", "number", "percent"]),
    value: z.unknown(),
    locale: z.string().optional(),
    currency: z.string().optional(),
    notation: z.string().optional(),
    style: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    now: z.number().optional(),
  }),
  resolve(raw, ctx) {
    const value = resolvePropValue(raw.value, ctx);
    const locale = raw.locale ?? undefined;
    const extra = raw.options ?? {};

    switch (raw.$format) {
      case "date": {
        const dateOnly = typeof value === "string" && DATE_ONLY.test(value);
        const date = coerceDate(value);
        if (Number.isNaN(date.getTime())) {
          return value == null ? "" : String(value);
        }
        if (raw.style === "relative") {
          const now = raw.now ?? Date.now();
          const diff = now - date.getTime();
          if (diff === 0) return "just now";
          const absDiff = Math.abs(diff);
          const suffix = diff > 0 ? "ago" : "from now";
          const seconds = Math.floor(absDiff / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          if (days > 0) return `${days}d ${suffix}`;
          if (hours > 0) return `${hours}h ${suffix}`;
          if (minutes > 0) return `${minutes}m ${suffix}`;
          return `${seconds}s ${suffix}`;
        }
        const options = { ...(extra as Intl.DateTimeFormatOptions) };
        // Date-only ISO strings are calendar dates, not UTC midnights.
        // Format them in UTC so "2024-01-15" stays the 15th in every timezone.
        if (dateOnly) options.timeZone = "UTC";
        return new Intl.DateTimeFormat(locale, options).format(date);
      }
      case "currency":
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: raw.currency ?? "USD",
          ...(extra as Intl.NumberFormatOptions),
        }).format(value as number);
      case "number":
        return new Intl.NumberFormat(locale, {
          ...(raw.notation
            ? {
                notation: raw.notation as Intl.NumberFormatOptions["notation"],
              }
            : {}),
          ...(extra as Intl.NumberFormatOptions),
        }).format(value as number);
      case "percent":
        return new Intl.NumberFormat(locale, {
          style: "percent",
          ...(extra as Intl.NumberFormatOptions),
        }).format(value as number);
      default:
        return value;
    }
  },
});

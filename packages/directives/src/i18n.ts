import { z } from "zod";
import { defineDirective, resolvePropValue } from "@json-render/core";
import type { DirectiveDefinition } from "@json-render/core";

export interface I18nConfig {
  /** Current locale (e.g. "en", "es") */
  locale: string;
  /** Map of locale → key → translated string */
  messages: Record<string, Record<string, string>>;
  /** Fallback locale when a key is missing in the current locale */
  fallbackLocale?: string;
}

/**
 * Create a `$t` directive for internationalization.
 *
 * @example
 * ```ts
 * const t = createI18nDirective({
 *   locale: 'en',
 *   messages: {
 *     en: { "greeting": "Hello, {{name}}!" },
 *     es: { "greeting": "Hola, {{name}}!" },
 *   },
 * });
 * ```
 */
export function createI18nDirective(config: I18nConfig): DirectiveDefinition {
  return defineDirective({
    name: "$t",
    description: "Translated text with {{param}} interpolation.",
    schema: z.object({
      $t: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    }),
    resolve(raw, ctx) {
      const key = raw.$t;

      const localeMessages = config.messages[config.locale];
      const fallbackMessages = config.fallbackLocale
        ? config.messages[config.fallbackLocale]
        : undefined;
      const template = localeMessages?.[key] ?? fallbackMessages?.[key] ?? key;

      if (!raw.params) return template;

      // Resolve every param first, then walk the original template once.
      // Values are inserted as plain text, so `$` sequences and `{{...}}`
      // are not expanded or scanned again, and keys are matched literally.
      const values = new Map<string, string>();
      const keyLengths = new Set<number>();
      for (const [paramKey, paramValue] of Object.entries(raw.params)) {
        const resolved = resolvePropValue(paramValue, ctx);
        values.set(paramKey, resolved != null ? String(resolved) : "");
        keyLengths.add(paramKey.length);
      }

      // `close` is reused while it still lies past the current `{{`, and spans
      // are only sliced when their length matches a param key, so a template
      // with many `{{` before one `}}` stays linear instead of quadratic.
      let result = "";
      let cursor = 0;
      let close = -1;
      while (cursor < template.length) {
        const open = template.indexOf("{{", cursor);
        if (open === -1) {
          result += template.slice(cursor);
          break;
        }

        if (close < open + 2) {
          close = template.indexOf("}}", open + 2);
          if (close === -1) {
            result += template.slice(cursor);
            break;
          }
        }

        const replacement = keyLengths.has(close - open - 2)
          ? values.get(template.slice(open + 2, close))
          : undefined;
        if (replacement === undefined) {
          // Not an exact param. Advance one character so a later `{{key}}`
          // that overlaps this span can still match.
          result += template.slice(cursor, open + 1);
          cursor = open + 1;
          continue;
        }

        result += template.slice(cursor, open);
        result += replacement;
        cursor = close + 2;
      }

      return result;
    },
  });
}

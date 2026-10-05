/**
 * Options for serialization
 */
export interface SerializeOptions {
  /** Quote style for strings */
  quotes?: "single" | "double";
  /** Indent for objects/arrays */
  indent?: number;
}

const DEFAULT_OPTIONS: Required<SerializeOptions> = {
  quotes: "double",
  indent: 2,
};

/**
 * Escape a string for use in code
 */
export function escapeString(
  str: string,
  quotes: "single" | "double" = "double",
): string {
  const quoteChar = quotes === "single" ? "'" : '"';
  const escaped = str
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

  if (quotes === "single") {
    return escaped.replace(/'/g, "\\'");
  }
  return escaped.replace(/"/g, '\\"');
}

/**
 * Serialize a single prop value to a code string
 *
 * @returns Object with `value` (the serialized string) and `needsBraces` (whether JSX needs {})
 */
export function serializePropValue(
  value: unknown,
  options: SerializeOptions = {},
): { value: string; needsBraces: boolean } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const q = opts.quotes === "single" ? "'" : '"';

  if (value === null) {
    return { value: "null", needsBraces: true };
  }

  if (value === undefined) {
    return { value: "undefined", needsBraces: true };
  }

  if (typeof value === "string") {
    return {
      value: `${q}${escapeString(value, opts.quotes)}${q}`,
      needsBraces: true,
    };
  }

  if (typeof value === "number") {
    return { value: String(value), needsBraces: true };
  }

  if (typeof value === "boolean") {
    if (value === true) {
      return { value: "true", needsBraces: false }; // Can use shorthand
    }
    return { value: "false", needsBraces: true };
  }

  if (Array.isArray(value)) {
    const items = value.map((v) => serializePropValue(v, opts).value);
    return { value: `[${items.join(", ")}]`, needsBraces: true };
  }

  if (typeof value === "object") {
    // Check for $state reference
    if (
      "$state" in value &&
      typeof (value as { $state: unknown }).$state === "string"
    ) {
      return {
        value: `{ $state: ${q}${escapeString((value as { $state: string }).$state, opts.quotes)}${q} }`,
        needsBraces: true,
      };
    }

    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        const serialized = serializePropValue(v, opts).value;
        // Use shorthand if key matches value for simple identifiers
        return `${k}: ${serialized}`;
      });

    return { value: `{ ${entries.join(", ")} }`, needsBraces: true };
  }

  return { value: String(value), needsBraces: true };
}

/**
 * Serialize props object to JSX attributes string
 */
export function serializeProps(
  props: Record<string, unknown>,
  options: SerializeOptions = {},
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    const serialized = serializePropValue(value, options);

    // Boolean true can be shorthand
    if (typeof value === "boolean" && value === true) {
      parts.push(key);
    } else if (serialized.needsBraces) {
      parts.push(`${key}={${serialized.value}}`);
    } else {
      parts.push(`${key}=${serialized.value}`);
    }
  }

  return parts.join(" ");
}

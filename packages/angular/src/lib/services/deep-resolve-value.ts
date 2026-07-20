let idCounter = 0;

/**
 * Generate a process-unique id for `$id` placeholders in `pushState` payloads.
 * Not cryptographically random — just unique within a session.
 */
export function generateUniqueId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

/**
 * Recursively resolve a value used in an action param, expanding two placeholders:
 * - `'$id'` (string) or `{ $id: ... }` (single-key object) -> a fresh unique id
 * - `{ $state: '/path' }` (single-key object) -> the value read from state via `get`
 *
 * Arrays and plain objects are resolved element/field-wise. All other values
 * pass through unchanged.
 */
export function deepResolveValue(
  value: unknown,
  get: (path: string) => unknown,
): unknown {
  if (value === null || value === undefined) return value;
  if (value === "$id") return generateUniqueId();

  if (Array.isArray(value)) {
    return value.map((item) => deepResolveValue(item, get));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1 && typeof obj["$state"] === "string") {
      return get(obj["$state"]);
    }
    if (keys.length === 1 && "$id" in obj) {
      return generateUniqueId();
    }

    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      resolved[key] = deepResolveValue(val, get);
    }
    return resolved;
  }

  return value;
}

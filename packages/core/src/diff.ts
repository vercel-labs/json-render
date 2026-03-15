import type { JsonPatch } from "./types";

/**
 * Escape a single JSON Pointer token per RFC 6901.
 * `~` → `~0`, `/` → `~1`.
 */
function escapeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function buildPath(basePath: string, key: string): string {
  return `${basePath}/${escapeToken(key)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Shallow equality for arrays — used to avoid emitting patches when the
 * children list hasn't actually changed.
 */
function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Produce RFC 6902 JSON Patch operations that transform `oldObj` into `newObj`.
 *
 * - New keys → `add`
 * - Changed scalar/array values → `replace`
 * - Removed keys → `remove`
 * - Arrays are compared shallowly and replaced atomically (not element-diffed)
 * - Plain objects recurse
 */
export function diffToPatches(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  basePath = "",
): JsonPatch[] {
  const patches: JsonPatch[] = [];

  // Keys present in newObj
  for (const key of Object.keys(newObj)) {
    const path = buildPath(basePath, key);
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (!(key in oldObj)) {
      patches.push({ op: "add", path, value: newVal });
      continue;
    }

    // Both exist — compare
    if (isPlainObject(oldVal) && isPlainObject(newVal)) {
      patches.push(...diffToPatches(oldVal, newVal, path));
    } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (!arraysEqual(oldVal, newVal)) {
        patches.push({ op: "replace", path, value: newVal });
      }
    } else if (oldVal !== newVal) {
      patches.push({ op: "replace", path, value: newVal });
    }
  }

  // Keys removed from oldObj
  for (const key of Object.keys(oldObj)) {
    if (!(key in newObj)) {
      patches.push({ op: "remove", path: buildPath(basePath, key) });
    }
  }

  return patches;
}

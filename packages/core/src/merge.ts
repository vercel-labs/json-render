function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep-merge `patch` into `base`, returning a new object.
 *
 * Semantics (RFC 7396 JSON Merge Patch):
 * - `null` values in `patch` delete the corresponding key from `base`
 * - Arrays in `patch` replace (not concat) the corresponding array in `base`
 * - Plain objects recurse
 * - All other values replace
 *
 * Neither `base` nor `patch` is mutated.
 */
export function deepMergeSpec(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(patch)) {
    const patchVal = patch[key];

    // null → delete
    if (patchVal === null) {
      delete result[key];
      continue;
    }

    const baseVal = result[key];

    if (isPlainObject(patchVal) && isPlainObject(baseVal)) {
      result[key] = deepMergeSpec(baseVal, patchVal);
    } else {
      result[key] = patchVal;
    }
  }

  return result;
}

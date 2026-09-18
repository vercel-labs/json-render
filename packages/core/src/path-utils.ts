/**
 * Parse a JSON Pointer token that addresses an array item.
 *
 * JavaScript arrays accept many property names that are not array indices.
 * JSON Pointer paths use only canonical decimal array indices: `0` or a
 * non-zero digit followed by digits, within the JavaScript array-index range.
 */
export function parseArrayIndex(token: string): number | undefined {
  if (!/^(?:0|[1-9]\d*)$/.test(token)) {
    return undefined;
  }

  const index = Number(token);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > 4_294_967_294 ||
    String(index) !== token
  ) {
    return undefined;
  }

  return index;
}

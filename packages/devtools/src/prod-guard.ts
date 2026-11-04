/**
 * Production guard. Framework adapters short-circuit to a no-op when this
 * returns true, so dropping `<JsonRenderDevtools />` into an app costs
 * nothing in production builds.
 *
 * Keep `process.env.NODE_ENV` directly replaceable by bundlers, even when
 * the browser has no `process` global. Unbundled environments without
 * `process.env` fall back to development behavior.
 */
export function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
}

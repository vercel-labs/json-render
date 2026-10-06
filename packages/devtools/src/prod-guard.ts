/**
 * Production guard. Framework adapters short-circuit to a no-op when this
 * returns true, so dropping `<JsonRenderDevtools />` into an app costs
 * nothing in production builds.
 *
 * Tree-shaken bundlers will fold constant `process.env.NODE_ENV` checks.
 * Check the expression directly so bundler replacement still works when
 * browsers have no `process` global. Unbundled browsers fall back to false.
 */
export function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
}

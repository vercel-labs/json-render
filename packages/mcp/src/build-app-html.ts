/**
 * Options for `buildAppHtml`.
 */
export interface BuildAppHtmlOptions {
  /** Title for the HTML page. Defaults to `"json-render"`. */
  title?: string;
  /**
   * Inline CSS to inject into the page `<style>` tag.
   * Use this to include Tailwind output or custom styles.
   */
  css?: string;
  /**
   * Bundled JavaScript for the app entry point.
   * This should be the output of a bundler (Vite, esbuild, etc.)
   * that bundles your React app, registry, and the
   * `useJsonRenderApp` hook into a single script.
   */
  js: string;
  /**
   * Additional `<head>` content (meta tags, font links, etc.).
   */
  head?: string;
}

/**
 * Build a self-contained HTML string for an MCP App UI resource.
 *
 * The resulting HTML is designed to be served as a `ui://` resource
 * via `registerJsonRenderResource` or `createMcpApp`.
 *
 * Typically you'd use a bundler (Vite + `vite-plugin-singlefile`, or
 * esbuild) to produce the `js` and `css` strings, then pass them here.
 *
 * @example
 * ```ts
 * import { buildAppHtml } from "@json-render/mcp/app";
 * import { readFileSync } from "node:fs";
 *
 * const html = buildAppHtml({
 *   title: "Dashboard",
 *   js: readFileSync("dist/app.js", "utf-8"),
 *   css: readFileSync("dist/app.css", "utf-8"),
 * });
 * ```
 */
export function buildAppHtml(options: BuildAppHtmlOptions): string {
  const { title = "json-render", css = "", js, head = "" } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  ${head}
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module">${js}</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Server-side utility for building self-contained MCP App HTML.
 *
 * This entry point does NOT depend on React and is safe to import
 * in Node.js / server environments.
 *
 * @packageDocumentation
 */

export { buildAppHtml } from "./build-app-html.js";
export type { BuildAppHtmlOptions } from "./build-app-html.js";

/**
 * Client-side (iframe) utilities for rendering json-render specs
 * inside an MCP App view.
 *
 * This module is intended to run **inside the sandboxed iframe** that
 * MCP hosts render. It connects to the host via the MCP Apps protocol,
 * receives tool results containing json-render specs, and provides
 * React hooks / helpers to render them.
 *
 * @example
 * ```tsx
 * import { useJsonRenderApp } from "@json-render/mcp/app";
 * import { Renderer } from "@json-render/react";
 *
 * function McpAppView({ registry }) {
 *   const { spec, loading } = useJsonRenderApp();
 *   return <Renderer spec={spec} registry={registry} loading={loading} />;
 * }
 * ```
 *
 * @packageDocumentation
 */

export { useJsonRenderApp } from "./use-json-render-app.js";
export type {
  UseJsonRenderAppOptions,
  UseJsonRenderAppReturn,
} from "./use-json-render-app.js";
export { buildAppHtml } from "./build-app-html.js";
export type { BuildAppHtmlOptions } from "./build-app-html.js";

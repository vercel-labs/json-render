import type { Catalog } from "@json-render/core";

/**
 * Options for creating an MCP App server backed by a json-render catalog.
 */
export interface CreateMcpAppOptions {
  /** Display name for the MCP server shown in client UIs. */
  name: string;
  /** Semantic version of the MCP server. */
  version: string;
  /** The json-render catalog defining available components and actions. */
  catalog: Catalog;
  /**
   * Pre-built HTML string for the UI resource.
   * Generate this with `buildAppHtml` from `@json-render/mcp/app` or
   * provide your own self-contained HTML page.
   */
  html: string;
  /**
   * Optional tool configuration overrides.
   */
  tool?: McpToolOptions;
}

/**
 * Options for configuring the MCP tool that renders json-render specs.
 */
export interface McpToolOptions {
  /** Tool name exposed to the LLM. Defaults to `"render-ui"`. */
  name?: string;
  /** Human-readable title. Defaults to `"Render UI"`. */
  title?: string;
  /** Tool description shown to the LLM. When omitted, a description is
   *  auto-generated from the catalog prompt. */
  description?: string;
}

/**
 * Options for registering the MCP App tool.
 */
export interface RegisterToolOptions {
  /** The json-render catalog. */
  catalog: Catalog;
  /** Tool name. */
  name: string;
  /** Tool title. */
  title: string;
  /** Tool description. */
  description: string;
  /** The `ui://` resource URI this tool's view is served from. */
  resourceUri: string;
}

/**
 * Options for registering the MCP App UI resource.
 */
export interface RegisterResourceOptions {
  /** The `ui://` resource URI. */
  resourceUri: string;
  /** Self-contained HTML string for the view. */
  html: string;
}

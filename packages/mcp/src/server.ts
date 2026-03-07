import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CreateMcpAppOptions,
  RegisterToolOptions,
  RegisterResourceOptions,
} from "./types.js";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

/**
 * Dynamically import the ext-apps server helpers to avoid CJS/ESM type
 * mismatches at compile time while still getting the proper runtime
 * `_meta.ui` normalization that hosts require.
 */
async function getExtApps() {
  const mod = await import("@modelcontextprotocol/ext-apps/server");
  return mod;
}

/**
 * Register a json-render tool on an existing MCP server.
 *
 * Uses `registerAppTool` from `@modelcontextprotocol/ext-apps/server`
 * so that MCP Apps-capable hosts (Claude, VS Code, Cursor, ChatGPT)
 * see the `_meta.ui.resourceUri` in the tool listing and know to
 * fetch and render the `ui://` resource as an interactive iframe.
 *
 * The tool accepts a json-render spec as input and returns it as text
 * content, which the iframe receives via `ontoolresult`.
 */
export async function registerJsonRenderTool(
  server: McpServer,
  options: RegisterToolOptions,
): Promise<void> {
  const { catalog, name, title, description, resourceUri } = options;
  const { registerAppTool } = await getExtApps();

  const specZodSchema = catalog.zodSchema();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (registerAppTool as any)(
    server,
    name,
    {
      title,
      description,
      inputSchema: { spec: specZodSchema },
      _meta: { ui: { resourceUri } },
    },
    async (args: { spec?: unknown }) => {
      const spec = args.spec;
      const validation = catalog.validate(spec);
      const validSpec = validation.success ? validation.data : spec;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(validSpec),
          },
        ],
      };
    },
  );
}

/**
 * Register a json-render UI resource on an existing MCP server.
 *
 * The resource serves the self-contained HTML page that renders
 * json-render specs received from tool results.
 */
export async function registerJsonRenderResource(
  server: McpServer,
  options: RegisterResourceOptions,
): Promise<void> {
  const { resourceUri, html } = options;
  const { registerAppResource, RESOURCE_MIME_TYPE: mimeType } =
    await getExtApps();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (registerAppResource as any)(
    server,
    resourceUri,
    resourceUri,
    { mimeType },
    async () => ({
      contents: [
        {
          uri: resourceUri,
          mimeType,
          text: html,
          _meta: {
            ui: {
              csp: {
                resourceDomains: ["https:"],
                connectDomains: ["https:"],
              },
            },
          },
        },
      ],
    }),
  );
}

/**
 * Create a fully-configured MCP server that serves a json-render catalog
 * as an MCP App.
 *
 * This is the main entry point for most users. It creates an `McpServer`,
 * registers the render tool and UI resource, and returns the server
 * ready for transport connection.
 *
 * @example
 * ```ts
 * import { createMcpApp } from "@json-render/mcp";
 *
 * const server = createMcpApp({
 *   name: "My Dashboard",
 *   version: "1.0.0",
 *   catalog: myCatalog,
 *   html: myBundledHtml,
 * });
 *
 * // Connect via stdio
 * import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
 * await server.connect(new StdioServerTransport());
 * ```
 */
export async function createMcpApp(
  options: CreateMcpAppOptions,
): Promise<McpServer> {
  const { name, version, catalog, html, tool } = options;

  const toolName = tool?.name ?? "render-ui";
  const toolTitle = tool?.title ?? "Render UI";
  const resourceUri = `ui://${toolName}/view.html`;

  const catalogPrompt = catalog.prompt();
  const toolDescription =
    tool?.description ??
    `Render an interactive UI. The spec argument must be a json-render spec conforming to the catalog.\n\n${catalogPrompt}`;

  const server = new McpServer({ name, version });

  await registerJsonRenderTool(server, {
    catalog,
    name: toolName,
    title: toolTitle,
    description: toolDescription,
    resourceUri,
  });

  await registerJsonRenderResource(server, { resourceUri, html });

  return server;
}

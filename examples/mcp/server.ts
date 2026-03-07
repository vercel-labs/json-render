import { createMcpApp } from "@json-render/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalog } from "./src/catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadHtml(): string {
  const htmlPath = path.join(__dirname, "dist", "index.html");
  if (!fs.existsSync(htmlPath)) {
    throw new Error(
      `Built HTML not found at ${htmlPath}. Run 'pnpm build' first.`,
    );
  }
  return fs.readFileSync(htmlPath, "utf-8");
}

async function startStdio() {
  const html = loadHtml();
  const server = await createMcpApp({
    name: "json-render Example",
    version: "1.0.0",
    catalog,
    html,
  });
  await server.connect(new StdioServerTransport());
}

async function startHttp() {
  const html = loadHtml();
  const port = parseInt(process.env.PORT ?? "3001", 10);

  const expressApp = createMcpExpressApp({ host: "0.0.0.0" });

  expressApp.all("/mcp", async (req, res) => {
    const server = await createMcpApp({
      name: "json-render Example",
      version: "1.0.0",
      catalog,
      html,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  expressApp.listen(port, () => {
    console.log(`MCP server listening on http://localhost:${port}/mcp`);
  });
}

if (process.argv.includes("--stdio")) {
  startStdio().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  startHttp().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

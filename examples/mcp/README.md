# MCP App Example

A json-render MCP App that serves interactive shadcn/ui-based UIs directly inside Claude, ChatGPT, Cursor, VS Code, and other MCP-capable clients.

## Setup

```bash
pnpm install
pnpm build
```

## Usage

### With Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "json-render": {
      "command": "npx",
      "args": ["tsx", "examples/mcp/server.ts", "--stdio"]
    }
  }
}
```

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "json-render": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/examples/mcp/server.ts", "--stdio"]
    }
  }
}
```

### HTTP Transport

```bash
pnpm start
# Server listens on http://localhost:3001/mcp
```

### Stdio Transport

```bash
pnpm start:stdio
```

## How It Works

1. The Vite build bundles the React app (with shadcn components and `useJsonRenderApp` hook) into a single self-contained HTML file
2. The MCP server registers a `render-ui` tool with the catalog prompt as its description
3. When the LLM calls the tool, it generates a json-render spec constrained to the catalog
4. The host renders the bundled HTML in a sandboxed iframe
5. The iframe receives the spec via the MCP Apps protocol and renders it with json-render

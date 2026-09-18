# Chat Example

An AI-powered data explorer that streams rich, interactive UI directly into a chat interface. The assistant uses tool calls to fetch real data (weather, GitHub, crypto, Hacker News, web search), then generates a json-render spec that renders inline alongside the conversation using shadcn components, Recharts, and React Three Fiber.

## What it shows

- **Streaming specs inside chat messages** -- `pipeJsonRender` on the server merges the AI SDK UI stream with json-render spec patches so text, tool-call indicators, and rendered UI all appear in the correct order within a single message bubble.
- **ToolLoopAgent with live data** -- the agent loops through tool calls (weather, GitHub repos/PRs, crypto prices, Hacker News, web search) to gather real data before generating UI.
- **Full catalog/registry stack** -- a catalog constrains what the model can produce; the registry maps every component to a real React implementation (shadcn, Recharts charts, R3F 3D scenes).
- **State and interactivity** -- `$state`, `$bindState`, visibility, and actions work inside the streamed spec, so the rendered UI is interactive, not static.

## Setup

```bash
pnpm install          # from the monorepo root
cd examples/chat
cp .env.example .env.local
```

Set the required environment variables in `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway key (auto-authenticated on Vercel) |
| `AI_GATEWAY_MODEL` | No | Model identifier, defaults to `anthropic/claude-haiku-4.5` |
| `KV_REST_API_URL` | No | Upstash Redis URL for rate limiting |
| `KV_REST_API_TOKEN` | No | Upstash Redis token |
| `RATE_LIMIT_PER_MINUTE` | No | Defaults to `10` |
| `RATE_LIMIT_PER_DAY` | No | Defaults to `100` |

Rate limiting is a no-op when the Upstash variables are not set.

## Run

```bash
pnpm dev
# http://chat-demo.json-render.localhost:1355
```

Requires global [`portless`](https://github.com/vercel-labs/portless). The `predev` script checks for it automatically.

## Build checks

From the monorepo root, run `pnpm --filter example-chat check-types` and `pnpm turbo run build --filter=example-chat`.

The type check also verifies that Streamdown and `@streamdown/code` resolve the same Shiki installation. The workspace dependency extension and scoped override keep their exported highlighting types compatible without relying on whichever Shiki version happens to be hoisted.

## Files

- `app/page.tsx` -- chat UI with `useChat`, message rendering, and inline spec display
- `app/api/generate/route.ts` -- streams the agent through `pipeJsonRender` with optional Upstash rate limiting
- `lib/agent.ts` -- `ToolLoopAgent` with system prompt from `explorerCatalog.prompt()` and custom rules for layout, 3D, and interactivity
- `lib/tools/` -- tool definitions for weather, GitHub, crypto, Hacker News, and web search
- `lib/render/catalog.ts` -- component catalog (shadcn base + custom metrics, tables, charts, tabs, 3D)
- `lib/render/registry.tsx` -- maps catalog types to React components (shadcn, Recharts, R3F)
- `lib/render/renderer.tsx` -- `ExplorerRenderer` wrapping `StateProvider`, `VisibilityProvider`, `ActionProvider`, and `Renderer`

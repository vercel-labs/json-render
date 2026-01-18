# json-render

**Predictable. Guardrailed. Fast.**

Let end users generate dashboards, widgets, apps, and data visualizations from prompts — safely constrained to components you define.

```bash
npm install @json-render/core @json-render/react
```

## Why json-render?

When users prompt for UI, you need guarantees. json-render gives AI a **constrained vocabulary** so output is always predictable:

- **Guardrailed** — AI can only use components in your catalog
- **Predictable** — JSON output matches your schema, every time
- **Fast** — Stream and render progressively as the model responds

## Quick Start

### 1. Define Your Catalog (what AI can use)

```typescript
import { createCatalog } from '@json-render/core';
import { z } from 'zod';

const catalog = createCatalog({
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      hasChildren: true,
    },
    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),      // Binds to your data
        format: z.enum(['currency', 'percent', 'number']),
      }),
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: ActionSchema,        // AI declares intent, you handle it
      }),
    },
  },
  actions: {
    export_report: { description: 'Export dashboard to PDF' },
    refresh_data: { description: 'Refresh all metrics' },
  },
});
```

### 2. Register Your Components (how they render)

```tsx
const registry = {
  Card: ({ element, children }) => (
    <div className="card">
      <h3>{element.props.title}</h3>
      {children}
    </div>
  ),
  Metric: ({ element }) => {
    const value = useDataValue(element.props.valuePath);
    return <div className="metric">{format(value)}</div>;
  },
  Button: ({ element, onAction }) => (
    <button onClick={() => onAction(element.props.action)}>
      {element.props.label}
    </button>
  ),
};
```

### 3. Create Your API Route (backend)
`useUIStream` expects JSONL patches from your API in this exact format:
```jsonl
{"op":"set","path":"/root","value":"element-key"}
{"op":"set","path":"/elements/{key}","value":{"key":"...","type":"...","props":{...},"children":[...]}}
```

#### useUIStream Reference
```typescript
const { tree, isStreaming, error, send, clear } = useUIStream({
  api: "/api/generate",
  onComplete: (tree) => {},
  onError: (error) => {},
});

// send() takes a STRING, not an object
await send("Create a dashboard");
```

#### Example API Route (Next.js + AI SDK)

```typescript
// app/api/generate/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM_PROMPT = `Output JSONL patches to build UI. Format:
{"op":"set","path":"/root","value":"key"}
{"op":"set","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}

Rules: One JSON per line. No markdown. children is array of key strings.`;

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = streamText({
    model: openai("gpt-4o"),
    system: SYSTEM_PROMPT,
    prompt,
  });
  return result.toTextStreamResponse();
}
```

#### Rendering the Tree

The `Renderer` component requires context providers – use `JSONUIProvider`:

```tsx
import { Renderer, JSONUIProvider } from "@json-render/react";

function App() {
  const { tree, isStreaming } = useUIStream({ api: "/api/generate" });

  return (
    <JSONUIProvider registry={registry}>
      {tree && <Renderer tree={tree} registry={registry} loading={isStreaming} />}
    </JSONUIProvider>
  );
}
```

### 4. Let AI Generate

```tsx
import { DataProvider, ActionProvider, Renderer, useUIStream } from '@json-render/react';

function Dashboard() {
  const { tree, send } = useUIStream({ api: '/api/generate' });

  return (
    <DataProvider initialData={{ revenue: 125000, growth: 0.15 }}>
      <ActionProvider actions={{
        export_report: () => downloadPDF(),
        refresh_data: () => refetch(),
      }}>
        <input
          placeholder="Create a revenue dashboard..."
          onKeyDown={(e) => e.key === 'Enter' && send(e.target.value)}
        />
        <Renderer tree={tree} registry={registry} />
      </ActionProvider>
    </DataProvider>
  );
}
```

**That's it.** AI generates JSON, you render it safely.

---

## Features

### Conditional Visibility

Show/hide components based on data, auth, or complex logic:

```json
{
  "type": "Alert",
  "props": { "message": "Error occurred" },
  "visible": {
    "and": [
      { "path": "/form/hasError" },
      { "not": { "path": "/form/errorDismissed" } }
    ]
  }
}
```

```json
{
  "type": "AdminPanel",
  "visible": { "auth": "signedIn" }
}
```

### Rich Actions

Actions with confirmation dialogs and callbacks:

```json
{
  "type": "Button",
  "props": {
    "label": "Refund Payment",
    "action": {
      "name": "refund",
      "params": {
        "paymentId": { "path": "/selected/id" },
        "amount": { "path": "/refund/amount" }
      },
      "confirm": {
        "title": "Confirm Refund",
        "message": "Refund ${/refund/amount} to customer?",
        "variant": "danger"
      },
      "onSuccess": { "set": { "/ui/success": true } },
      "onError": { "set": { "/ui/error": "$error.message" } }
    }
  }
}
```

### Built-in Validation

```json
{
  "type": "TextField",
  "props": {
    "label": "Email",
    "valuePath": "/form/email",
    "checks": [
      { "fn": "required", "message": "Email is required" },
      { "fn": "email", "message": "Invalid email" }
    ],
    "validateOn": "blur"
  }
}
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@json-render/core` | Types, schemas, visibility, actions, validation |
| `@json-render/react` | React renderer, providers, hooks |

## Demo

```bash
git clone https://github.com/vercel-labs/json-render
cd json-render
pnpm install
pnpm dev
```

- http://localhost:3000 — Docs & Playground
- http://localhost:3001 — Example Dashboard

## Project Structure

```
json-render/
├── packages/
│   ├── core/        → @json-render/core
│   └── react/       → @json-render/react
├── apps/
│   └── web/         → Docs & Playground site
└── examples/
    └── dashboard/   → Example dashboard app
```

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Prompt │────▶│  AI + Catalog│────▶│  JSON Tree  │
│ "dashboard" │     │ (guardrailed)│     │(predictable)│
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
                    ┌──────────────┐            │
                    │  Your React  │◀───────────┘
                    │  Components  │ (streamed)
                    └──────────────┘
```

1. **Define the guardrails** — what components, actions, and data bindings AI can use
2. **Users prompt** — end users describe what they want in natural language
3. **AI generates JSON** — output is always predictable, constrained to your catalog
4. **Render fast** — stream and render progressively as the model responds

## License

Apache-2.0

import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Quick Start | json-render",
};

export default function QuickStartPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Quick Start</h1>
      <p className="text-muted-foreground mb-8">
        Get up and running with json-render in 5 minutes.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        1. Define your catalog
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Create a catalog that defines what components AI can use:
      </p>
      <Code lang="typescript">{`// lib/catalog.ts
import { createCatalog } from '@json-render/core';
import { z } from 'zod';

export const catalog = createCatalog({
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      hasChildren: true,
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string(),
      }),
    },
    Text: {
      props: z.object({
        content: z.string(),
      }),
    },
  },
  actions: {
    submit: {
      params: z.object({ formId: z.string() }),
    },
    navigate: {
      params: z.object({ url: z.string() }),
    },
  },
});`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        2. Create your components
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Register React components that render each catalog type:
      </p>
      <Code lang="tsx">{`// components/registry.tsx
export const registry = {
  Card: ({ element, children }) => (
    <div className="p-4 border rounded-lg">
      <h2 className="font-bold">{element.props.title}</h2>
      {element.props.description && (
        <p className="text-gray-600">{element.props.description}</p>
      )}
      {children}
    </div>
  ),
  Button: ({ element, onAction }) => (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={() => onAction(element.props.action, {})}
    >
      {element.props.label}
    </button>
  ),
  Text: ({ element }) => (
    <p>{element.props.content}</p>
  ),
};`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        3. Create an API route
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Set up a streaming API route for AI generation:
      </p>
      <Code lang="typescript">{`// app/api/generate/route.ts
import { streamText } from 'ai';
import { generateCatalogPrompt } from '@json-render/core';
import { catalog } from '@/lib/catalog';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const systemPrompt = generateCatalogPrompt(catalog);

  const result = streamText({
    model: 'anthropic/claude-haiku-4.5',
    system: systemPrompt,
    prompt,
  });

  return new Response(result.textStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">4. Render the UI</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use the providers and renderer to display AI-generated UI:
      </p>
      <Code lang="tsx">{`// app/page.tsx
'use client';

import { DataProvider, ActionProvider, VisibilityProvider, Renderer, useUIStream } from '@json-render/react';
import { registry } from '@/components/registry';

export default function Page() {
  const { tree, isStreaming, send } = useUIStream({
    api: '/api/generate',
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    send(formData.get('prompt') as string);
  };

  return (
    <DataProvider initialData={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{
          submit: (params) => console.log('Submit:', params),
          navigate: (params) => console.log('Navigate:', params),
        }}>
          <form onSubmit={handleSubmit}>
            <input
              name="prompt"
              placeholder="Describe what you want..."
              className="border p-2 rounded"
            />
            <button type="submit" disabled={isStreaming}>
              Generate
            </button>
          </form>

          <div className="mt-8">
            <Renderer tree={tree} registry={registry} />
          </div>
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next steps</h2>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
        <li>
          Learn about{" "}
          <Link
            href="/docs/catalog"
            className="text-foreground hover:underline"
          >
            catalogs
          </Link>{" "}
          in depth
        </li>
        <li>
          Explore{" "}
          <Link
            href="/docs/data-binding"
            className="text-foreground hover:underline"
          >
            data binding
          </Link>{" "}
          for dynamic values
        </li>
        <li>
          Add{" "}
          <Link
            href="/docs/actions"
            className="text-foreground hover:underline"
          >
            actions
          </Link>{" "}
          for interactivity
        </li>
        <li>
          Implement{" "}
          <Link
            href="/docs/visibility"
            className="text-foreground hover:underline"
          >
            conditional visibility
          </Link>
        </li>
      </ul>
    </article>
  );
}

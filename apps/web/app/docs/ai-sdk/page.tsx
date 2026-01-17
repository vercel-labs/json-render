import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "AI SDK Integration | json-render",
};

export default function AiSdkPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">AI SDK Integration</h1>
      <p className="text-muted-foreground mb-8">
        Use json-render with the Vercel AI SDK for seamless streaming.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Installation</h2>
      <Code lang="bash">npm install ai</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">API Route Setup</h2>
      <Code lang="typescript">{`// app/api/generate/route.ts
import { streamText } from 'ai';
import { generateCatalogPrompt } from '@json-render/core';
import { catalog } from '@/lib/catalog';

export async function POST(req: Request) {
  const { prompt, currentTree } = await req.json();
  
  const systemPrompt = generateCatalogPrompt(catalog);
  
  // Optionally include current UI state for context
  const contextPrompt = currentTree 
    ? \`\\n\\nCurrent UI state:\\n\${JSON.stringify(currentTree, null, 2)}\`
    : '';

  const result = streamText({
    model: 'anthropic/claude-haiku-4.5',
    system: systemPrompt + contextPrompt,
    prompt,
  });

  return new Response(result.textStream, {
    headers: { 
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Client-Side Hook</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code className="text-foreground">useUIStream</code> on the client:
      </p>
      <Code lang="tsx">{`'use client';

import { useUIStream } from '@json-render/react';

function GenerativeUI() {
  const { tree, isStreaming, error, send } = useUIStream({
    api: '/api/generate',
  });

  return (
    <div>
      <button 
        onClick={() => send('Create a dashboard with metrics')}
        disabled={isStreaming}
      >
        {isStreaming ? 'Generating...' : 'Generate'}
      </button>
      
      {error && <p className="text-red-500">{error.message}</p>}
      
      <Renderer tree={tree} registry={registry} />
    </div>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Prompt Engineering</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The <code className="text-foreground">generateCatalogPrompt</code>{" "}
        function creates an optimized prompt that:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>Lists all available components and their props</li>
        <li>Describes available actions</li>
        <li>Specifies the expected JSON output format</li>
        <li>Includes examples for better generation</li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Custom System Prompts
      </h2>
      <Code lang="typescript">{`const basePrompt = generateCatalogPrompt(catalog);

const customPrompt = \`
\${basePrompt}

Additional instructions:
- Always use Card components for grouping related content
- Prefer horizontal layouts (Row) for metrics
- Use consistent spacing with padding="md"
\`;`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link
          href="/docs/streaming"
          className="text-foreground hover:underline"
        >
          progressive streaming
        </Link>
        .
      </p>
    </article>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Demo } from "@/components/demo";
import { Code } from "@/components/code";
import { CopyButton } from "@/components/copy-button";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter mb-6">
          AI → json-render → UI
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          Define a component catalog. Users prompt. AI outputs JSON constrained
          to your catalog. Your components render it.
        </p>

        <Demo />

        <div className="flex items-center justify-center gap-2 border border-border rounded px-4 py-3 mt-12 mx-auto w-fit">
          <code className="text-sm bg-transparent">
            npm install @json-render/core @json-render/react
          </code>
          <CopyButton text="npm install @json-render/core @json-render/react" />
        </div>

        <div className="flex gap-3 justify-center mt-6">
          <Button size="lg" asChild>
            <Link href="/docs">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/vercel-labs/json-render"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-3">
                01
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Define Your Catalog
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Set the guardrails. Define which components, actions, and data
                bindings AI can use.
              </p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-3">
                02
              </div>
              <h3 className="text-lg font-semibold mb-2">Users Prompt</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                End users describe what they want. AI generates JSON constrained
                to your catalog.
              </p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-3">
                03
              </div>
              <h3 className="text-lg font-semibold mb-2">Render Instantly</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Stream the response. Your components render progressively as
                JSON arrives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Code example */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold mb-4">
                Define your catalog
              </h2>
              <p className="text-muted-foreground mb-6">
                Components, actions, and validation functions.
              </p>
              <Code lang="typescript">{`import { createCatalog } from '@json-render/core';
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
    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        format: z.enum(['currency', 'percent']),
      }),
    },
  },
  actions: {
    export: { params: z.object({ format: z.string() }) },
  },
});`}</Code>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold mb-4">AI generates JSON</h2>
              <p className="text-muted-foreground mb-6">
                Constrained output that your components render natively.
              </p>
              <Code lang="json">{`{
  "key": "dashboard",
  "type": "Card",
  "props": {
    "title": "Revenue Dashboard",
    "description": null
  },
  "children": [
    {
      "key": "revenue",
      "type": "Metric",
      "props": {
        "label": "Total Revenue",
        "valuePath": "/metrics/revenue",
        "format": "currency"
      }
    }
  ]
}`}</Code>
            </div>
          </div>
        </div>
      </section>

      {/* Code Export */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-4">Export as Code</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Export generated UI as standalone React components. No runtime
              dependencies required.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold mb-4">Generated UI Tree</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                AI generates a JSON structure from the user&apos;s prompt.
              </p>
              <Code lang="json">{`{
  "root": "card",
  "elements": {
    "card": {
      "key": "card",
      "type": "Card",
      "props": { "title": "Revenue" },
      "children": ["metric", "chart"]
    },
    "metric": {
      "key": "metric",
      "type": "Metric",
      "props": {
        "label": "Total Revenue",
        "valuePath": "analytics/revenue",
        "format": "currency"
      }
    },
    "chart": {
      "key": "chart",
      "type": "Chart",
      "props": {
        "dataPath": "analytics/salesByRegion"
      }
    }
  }
}`}</Code>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold mb-4">
                Exported React Code
              </h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Export as a standalone Next.js project with all components.
              </p>
              <Code lang="tsx">{`"use client";

import { Card, Metric, Chart } from "@/components/ui";

const data = {
  analytics: {
    revenue: 125000,
    salesByRegion: [
      { label: "US", value: 45000 },
      { label: "EU", value: 35000 },
    ],
  },
};

export default function Page() {
  return (
    <Card data={data} title="Revenue">
      <Metric
        data={data}
        label="Total Revenue"
        valuePath="analytics/revenue"
        format="currency"
      />
      <Chart data={data} dataPath="analytics/salesByRegion" />
    </Card>
  );
}`}</Code>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              The export includes{" "}
              <code className="text-foreground">package.json</code>, component
              files, styles, and everything needed to run independently.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <h2 className="text-2xl font-semibold mb-12 text-center">Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Guardrails",
                desc: "AI can only use components you define in the catalog",
              },
              {
                title: "Streaming",
                desc: "Progressive rendering as JSON streams from the model",
              },
              {
                title: "Code Export",
                desc: "Export as standalone React code with no runtime dependencies",
              },
              {
                title: "Data Binding",
                desc: "Two-way binding with JSON Pointer paths",
              },
              {
                title: "Actions",
                desc: "Named actions handled by your application",
              },
              {
                title: "Visibility",
                desc: "Conditional show/hide based on data or auth",
              },
            ].map((feature) => (
              <div key={feature.title}>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-2xl font-semibold mb-4">Get started</h2>
          <div className="flex items-center justify-center gap-2 border border-border rounded px-4 py-3 mb-8 mx-auto w-fit">
            <code className="text-sm bg-transparent">
              npm install @json-render/core @json-render/react
            </code>
            <CopyButton text="npm install @json-render/core @json-render/react" />
          </div>
          <div>
            <Button asChild>
              <Link href="/docs">Documentation</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

# @json-render/next

Next.js renderer for [@json-render/core](https://json-render.dev). JSON becomes full Next.js applications with routes, layouts, metadata, and SSR.

## Installation

```bash
npm install @json-render/core @json-render/react @json-render/next
```

## Quick Start

### 1. Define your application spec

```typescript
// lib/spec.ts
import type { NextAppSpec } from "@json-render/next";

export const spec: NextAppSpec = {
  metadata: {
    title: { default: "My App", template: "%s | My App" },
  },
  layouts: {
    main: {
      root: "shell",
      elements: {
        shell: { type: "Container", props: {}, children: ["nav", "slot"] },
        nav: { type: "NavBar", props: {}, children: [] },
        slot: { type: "Slot", props: {}, children: [] },
      },
    },
  },
  routes: {
    "/": {
      layout: "main",
      metadata: { title: "Home" },
      page: { root: "hero", elements: { hero: { type: "Card", props: { title: "Welcome" }, children: [] } } },
    },
    "/about": {
      layout: "main",
      metadata: { title: "About" },
      page: { root: "content", elements: { content: { type: "Card", props: { title: "About" }, children: [] } } },
    },
  },
};
```

### 2. Create the app

```typescript
// lib/app.ts
import { createNextApp } from "@json-render/next/server";
import { spec } from "./spec";

export const { getPageData, generateMetadata, generateStaticParams } = createNextApp({ spec });
```

### 3. Wire up Next.js routes

```tsx
// app/[[...slug]]/page.tsx
import { notFound } from "next/navigation";
import { getPageData } from "@/lib/app";
import { SiteRenderer } from "./renderer";

export { generateMetadata, generateStaticParams } from "@/lib/app";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const data = await getPageData({ params });
  if (!data) notFound();
  return <SiteRenderer {...data} />;
}
```

```tsx
// app/[[...slug]]/renderer.tsx
"use client";

import { PageRenderer } from "@json-render/next";
import type { PageRendererProps } from "@json-render/next";

export function SiteRenderer(props: PageRendererProps) {
  return <PageRenderer {...props} />;
}
```

```tsx
// app/[[...slug]]/layout.tsx
import { NextAppProvider } from "@json-render/next";
import { registry, handlers } from "@/lib/registry";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextAppProvider registry={registry} handlers={handlers}>
          {children}
        </NextAppProvider>
      </body>
    </html>
  );
}
```

## Features

- **Pages as spec** -- Define entire multi-page apps in JSON
- **Route matching** -- Dynamic segments (`[slug]`), catch-all (`[...path]`), optional catch-all (`[[...path]]`)
- **Nested layouts** -- Reusable layouts with `Slot` component for content injection
- **SEO metadata** -- Per-route metadata with title templates, OpenGraph, Twitter cards
- **SSR** -- Server-side rendering via Next.js App Router
- **Data loaders** -- Server-side async data loading before page render
- **Static generation** -- `generateStaticParams` for pre-rendering
- **Client navigation** -- Built-in `Link` component wrapping `next/link`
- **Error/Loading/NotFound** -- Per-route error boundaries, loading states, and 404 pages
- **AI streaming** -- Generate entire apps with JSONL patches via `SpecStream`

## Entry Points

| Import                     | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `@json-render/next`        | Client components (NextAppProvider, PageRenderer) |
| `@json-render/next/server` | Server utilities (createNextApp, matchRoute)      |

## Documentation

See the [json-render documentation](https://json-render.dev/docs/api/next) for full API reference.

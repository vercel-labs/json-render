# @json-render/start

TanStack Start renderer for [@json-render/core](https://json-render.dev). JSON becomes full TanStack Start applications with routes, layouts, head metadata, and SSR.

## Installation

```bash
npm install @json-render/core @json-render/react @json-render/start
```

## Quick Start

### 1. Define your application spec

```typescript
import type { StartAppSpec } from "@json-render/start";

const spec: StartAppSpec = {
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
// src/lib/app.ts
import { createStartApp } from "@json-render/start/server";

export const { getPageData, getHead, getStaticPaths } = createStartApp({ spec });
```

### 3. Wire up a catch-all route

```tsx
// src/routes/$.tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageRenderer } from "@json-render/start";
import { getPageData, getHead } from "@/lib/app";

export const Route = createFileRoute("/$")({
  loader: async ({ location }) => {
    const data = await getPageData({ pathname: location.pathname });
    if (!data) throw notFound();
    return data;
  },
  head: ({ match }) => getHead({ pathname: match.pathname }),
  component: () => <PageRenderer {...Route.useLoaderData()} />,
});
```

### 4. Provide the registry in the root route

```tsx
// src/routes/__root.tsx
import { StartAppProvider } from "@json-render/start";
import { registry, handlers } from "@/lib/registry";

function RootComponent() {
  return (
    <StartAppProvider registry={registry} handlers={handlers}>
      <Outlet />
    </StartAppProvider>
  );
}
```

## Features

- **Pages as spec** -- Define entire multi-page apps in JSON
- **Route matching** -- Dynamic segments (`[slug]`), catch-all (`[...path]`), optional catch-all (`[[...path]]`)
- **Nested layouts** -- Reusable layouts with `Slot` component for content injection
- **Head metadata** -- Per-route metadata with title templates, OpenGraph, Twitter cards, resolved to TanStack Start `head()` descriptors
- **SSR** -- Server-side rendering via TanStack Start loaders
- **Data loaders** -- Server-side async data loading before page render
- **Static generation** -- `getStaticPaths` for prerendering (TanStack Start `pages` config)
- **Client navigation** -- Built-in `Link` component wrapping TanStack Router's `Link`
- **Error/Loading/NotFound** -- `StartErrorBoundary`, `StartLoading`, and `StartNotFound` components

## Entry Points

| Import                      | Description                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `@json-render/start`        | Client components (StartAppProvider, PageRenderer, Link)              |
| `@json-render/start/server` | Server utilities (createStartApp, matchRoute, schema, resolveMetadata) |

## Documentation

See the [json-render documentation](https://json-render.dev/docs/api/start) for full API reference.

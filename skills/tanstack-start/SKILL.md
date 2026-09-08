---
name: tanstack-start
description: Build JSON-defined TanStack Start applications with @json-render/tanstack-start. Use for Start route specs, splat routing, SSR loaders, head metadata, layouts, and client navigation. Do not use for generic TanStack Router apps that do not use json-render.
---

# @json-render/tanstack-start

Use this integration when a TanStack Start app needs complete pages or routes
described by json-render specs.

## Install

```bash
npm install @json-render/core @json-render/react @json-render/tanstack-start
```

## Application Spec

Include the server-safe built-in definitions in the generation catalog. The
renderer supplies their component implementations.

```typescript
import { defineCatalog } from "@json-render/core";
import {
  schema,
  startComponentDefinitions,
} from "@json-render/tanstack-start/server";

const catalog = defineCatalog(schema, {
  components: {
    ...startComponentDefinitions,
    Card: cardDefinition,
    Shell: shellDefinition,
    Navigation: navigationDefinition,
    Home: homeDefinition,
    Post: postDefinition,
  },
  actions: {},
});
```

Then use `StartAppSpec` and TanStack Router route patterns:

```typescript
import type { StartAppSpec } from "@json-render/tanstack-start";

export const spec: StartAppSpec = {
  metadata: {
    title: { default: "Site", template: "%s | Site" },
  },
  layouts: {
    main: {
      root: "shell",
      elements: {
        shell: { type: "Shell", props: {}, children: ["nav", "slot"] },
        nav: { type: "Navigation", props: {}, children: [] },
        slot: { type: "Slot", props: {}, children: [] },
      },
    },
  },
  routes: {
    "/": {
      layout: "main",
      metadata: { title: "Home" },
      page: {
        root: "home",
        elements: {
          home: { type: "Home", props: {}, children: [] },
        },
      },
    },
    "/posts/$slug": {
      layout: "main",
      loader: "post",
      staticParams: [{ slug: "hello" }],
      page: {
        root: "post",
        elements: {
          post: {
            type: "Post",
            props: { value: { $state: "/post" } },
            children: [],
          },
        },
      },
    },
  },
};
```

Routes use `/posts/$slug` for named parameters and `/docs/$` for a splat.
Splat loader parameters are slash-delimited strings under `_splat`. Escape
route-key slashes as `~1` when generating RFC 6902 patches.

Every layout needs a `Slot` element. Declare `Slot` and `Link` through
`startComponentDefinitions`; do not require consumers to register React
implementations for them.

## Server Helpers

```typescript
import { createStartApp } from "@json-render/tanstack-start/server";

export const { getPageData, getHead, getStaticPaths } = createStartApp({
  spec,
  loaders: {
    post: async ({ slug }) => ({ post: await getPost(slug as string) }),
  },
});
```

State merge precedence is application state, layout state, page state, then
loader data. `getHead` merges app and route metadata into TanStack `meta` and
`links` descriptors. `getStaticPaths` includes static routes plus dynamic
routes with `staticParams`. Convert its strings to `{ path }` objects for
TanStack Start's top-level `pages` plugin option. Loader params are URL-decoded,
while values from `staticParams` are URL-encoded in generated paths.
Route matching treats trailing slashes as optional and accepts encoded or
decoded pathname representations so loader data and metadata resolve the same
static route.

## Route Wiring

```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  PageRenderer,
  StartErrorBoundary,
  StartLoading,
  StartNotFound,
} from "@json-render/tanstack-start";
import { getHead, getPageData } from "@/lib/json-app";

export const Route = createFileRoute("/$")({
  loader: async ({ location }) => {
    const data = await getPageData({ pathname: location.pathname });
    if (!data) throw notFound();
    return data;
  },
  head: ({ match }) => getHead({ pathname: match.pathname }),
  component: () => <PageRenderer {...Route.useLoaderData()} />,
  pendingComponent: StartLoading,
  errorComponent: StartErrorBoundary,
  notFoundComponent: StartNotFound,
});
```

TanStack Router loaders run on both the server and client. If a spec factory or
named loader uses credentials, database clients, or server-only imports, wrap
`getPageData` and `getHead` in a TanStack Start `createServerFn`; do not import
that server code directly into an isomorphic route loader.

## Root Provider

Wrap the root route's `Outlet` with `StartAppProvider`. Render `HeadContent` so
metadata from `getHead` reaches the document.

```tsx
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { StartAppProvider } from "@json-render/tanstack-start";
import { spec } from "@/lib/spec";

export const Route = createRootRoute({
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <StartAppProvider
          registry={registry}
          handlers={handlers}
          spec={spec}
        >
          <Outlet />
        </StartAppProvider>
        <Scripts />
      </body>
    </html>
  ),
});
```

Use `StartLoading`, `StartErrorBoundary`, and `StartNotFound` for TanStack
Router's `pendingComponent`, `errorComponent`, and `notFoundComponent` options.
When `StartAppProvider` receives `spec`, each component selects the matched
route's corresponding fallback. Explicit fallback props override that lookup.
Pass named `$computed` implementations through `StartAppProvider.functions`.
The default error boundary invalidates the router and reruns a failed loader
when the user selects **Try again**.

Import React components from `@json-render/tanstack-start`. Import `schema`,
`createStartApp`, `matchRoute`, `resolveMetadata`, and static path helpers from
`@json-render/tanstack-start/server`.

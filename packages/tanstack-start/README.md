# @json-render/tanstack-start

TanStack Start renderer for [@json-render/core](https://json-render.dev).
Define routes, layouts, head metadata, state, and loader-backed pages as JSON,
then render them through TanStack Router and Start SSR.

## Installation

```bash
npm install @json-render/core @json-render/react @json-render/tanstack-start
```

## Quick Start

### 1. Define the catalog

Include the definitions for the built-in `Slot` and `Link` components. Their
React implementations are added automatically by `PageRenderer`.

```typescript
import { defineCatalog } from "@json-render/core";
import {
  schema,
  startComponentDefinitions,
} from "@json-render/tanstack-start/server";

export const catalog = defineCatalog(schema, {
  components: {
    ...startComponentDefinitions,
    Card: cardDefinition,
    Container: containerDefinition,
    NavBar: navBarDefinition,
    Post: postDefinition,
  },
  actions: {},
});
```

### 2. Define the application

```typescript
import type { StartAppSpec } from "@json-render/tanstack-start";

export const spec: StartAppSpec = {
  metadata: {
    title: { default: "My App", template: "%s | My App" },
  },
  layouts: {
    main: {
      root: "shell",
      elements: {
        shell: {
          type: "Container",
          props: {},
          children: ["nav", "slot"],
        },
        nav: { type: "NavBar", props: {}, children: [] },
        slot: { type: "Slot", props: {}, children: [] },
      },
    },
  },
  routes: {
    "/": {
      layout: "main",
      metadata: { title: "Home" },
      page: {
        root: "hero",
        elements: {
          hero: {
            type: "Card",
            props: { title: "Welcome" },
            children: [],
          },
        },
      },
    },
    "/blog/$slug": {
      layout: "main",
      loader: "post",
      page: {
        root: "post",
        elements: {
          post: {
            type: "Post",
            props: { post: { $state: "/post" } },
            children: [],
          },
        },
      },
    },
  },
};
```

### 3. Create the route helpers

```typescript
// src/lib/json-app.ts
import { createStartApp } from "@json-render/tanstack-start/server";
import { spec } from "./spec";

export const { getPageData, getHead, getStaticPaths } = createStartApp({
  spec,
  loaders: {
    post: async ({ slug }) => ({ post: await getPost(slug as string) }),
  },
});
```

### 4. Wire a splat route

```tsx
// src/routes/$.tsx
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
  component: Page,
  pendingComponent: StartLoading,
  errorComponent: StartErrorBoundary,
  notFoundComponent: StartNotFound,
});

function Page() {
  return <PageRenderer {...Route.useLoaderData()} />;
}
```

TanStack Router loaders are isomorphic. If your spec factory or named loaders
contain secrets or server-only imports, call `getPageData` and `getHead` from a
TanStack Start `createServerFn` and return the resulting data from the route
loader.

### 5. Provide the registry

```tsx
// src/routes/__root.tsx
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { StartAppProvider } from "@json-render/tanstack-start";
import { registry, handlers } from "@/lib/registry";
import { spec } from "@/lib/spec";

export const Route = createRootRoute({ component: Root });

function Root() {
  return (
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
  );
}
```

Passing `spec` lets the Router boundary components automatically render the
matched route's `loading`, `error`, and `notFound` specs. An explicit
`loadingSpec`, `errorSpec`, or `notFoundSpec` prop overrides this lookup. If the
application spec is server-only, omit `spec` from the provider and supply those
explicit props from client-safe fallback specs.

The default `StartErrorBoundary` fallback invalidates the router and reruns the
failed loader when the user selects **Try again**.

Pass named functions through the provider when generated props use
`$computed`:

```tsx
<StartAppProvider
  registry={registry}
  spec={spec}
  functions={{ uppercase: ({ value }) => String(value).toUpperCase() }}
>
  <Outlet />
</StartAppProvider>
```

## Route Patterns

| Pattern       | Matches       | Loader params            |
| ------------- | ------------- | ------------------------ |
| `/`           | `/`           | `{}`                     |
| `/about`      | `/about`      | `{}`                     |
| `/blog/$slug` | `/blog/hello` | `{ slug: "hello" }`      |
| `/docs/$`     | `/docs/a/b`   | `{ _splat: "a/b" }`       |

Static routes are included in `getStaticPaths()`. Dynamic routes are included
when their route spec supplies `staticParams`. Loader parameters are URL-decoded,
and splat content is a slash-delimited string under `_splat`. Parameter values
emitted by `getStaticPaths()` are URL-encoded.

Route matching treats trailing slashes as optional and accepts both encoded and
decoded pathname representations. This keeps loader data and route metadata in
sync for static paths containing spaces or non-ASCII characters.

Initial state is merged in this order: application state, layout state, page
state, then loader data. Later sources override earlier values.

Map the paths to TanStack Start's top-level `pages` option when prerendering:

```typescript
const pages = (await getStaticPaths()).map((path) => ({ path }));
```

## Entry Points

| Import                                | Description                                                   |
| ------------------------------------- | ------------------------------------------------------------- |
| `@json-render/tanstack-start`         | Provider, page renderer, Link, and route fallback components  |
| `@json-render/tanstack-start/server`  | App factory, schema, matcher, metadata, and prerender helpers |
| `@json-render/tanstack-start/catalog` | Server-safe definitions for built-in Slot and Link components |

See the [full API reference](https://json-render.dev/docs/api/tanstack-start).

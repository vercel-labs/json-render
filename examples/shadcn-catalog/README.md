# shadcn Catalog Example

Minimal runnable example for
[vercel-labs/json-render#257](https://github.com/vercel-labs/json-render/issues/257).
One page renders a small shadcn catalog through the React `Renderer`.

## What is inside

`catalog/catalog.ts` picks seven standard definitions from
`@json-render/shadcn/catalog` (Card, Stack, Heading, Text, Badge, Alert,
Button) and adds one custom component, `Metric`. `catalog/custom.ts` holds
the custom Zod props plus one typed action, `trackMetric`, with typed params.
`catalog/spec.ts` holds the page spec so the page and the smoke test share
one source. `app/page.tsx` builds the registry with `defineRegistry`,
implements `Metric` as a plain bordered card, and renders the spec inside
`JSONUIProvider`.

What is new relative to `skills/json-render-shadcn/SKILL.md`: the skill
documents the catalog shape and the extension pattern in prose. This example
is that pattern running as a page, with validation and render covered by a
test.

Note on wire format: specs here are plain JSON. A YAML wire form would save
tokens on the wire (as raised in the issue) but it is out of scope here, so
there is no YAML dependency in this example.

## Install

From the repo root, install once with pnpm. This example links the workspace
packages `@json-render/core`, `@json-render/react`, and `@json-render/shadcn`.

## Run

Change into this directory and start the dev server, then open the printed
local URL:

```bash
pnpm dev
```

## Checks

Typecheck the example:

```bash
pnpm check-types
```

Run the smoke test from the repo root (it validates the spec against the
catalog and renders the page spec):

```bash
npx vitest run examples/shadcn-catalog
```

For full shadcn styling, wire Tailwind into the app the same way
`examples/react-pdf` does (its `postcss.config.mjs` and `globals.css` are the
reference). Styling is the only part left out to keep this example small.

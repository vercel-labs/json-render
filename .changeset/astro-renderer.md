---
"@json-render/core": minor
"@json-render/astro": minor
---

Add @json-render/astro renderer

### New:

- **@json-render/astro**: Astro renderer with `defineRegistry` + `<Renderer />` for `.astro` components. Same API pattern as React, Vue, Svelte, and Solid renderers.
- `defineRegistry(catalog, { components })`: create a typed registry from a catalog with Astro components
- `<Renderer />` (`@json-render/astro/Renderer.astro`): walks the spec tree and renders each element using real `.astro` files with `<slot />` for children
- `<ElementRenderer />` (`@json-render/astro/ElementRenderer.astro`): recursive tree walker using `Astro.self`
- `schema`: element schema with Astro-specific default rules (static HTML, semantic HTML, no interactive actions)
- Works in SSG (build time, no adapter) and SSR (request time, with any adapter: Cloudflare, Netlify, Node, Vercel)
- Astro Islands pattern: static content via `@json-render/astro` + interactive islands via framework renderers (`@json-render/react`, `/vue`, `/svelte`, `/solid`) with `client:*` directives
- Full support for `$state`, `$cond`, `$item`, `$index`, `visible`, and `repeat` expressions
- Astro example project with full static demo and hybrid islands demo (React counter)

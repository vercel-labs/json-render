# @json-render/react-email

## 0.14.1

### Patch Changes

- Updated dependencies [43b7515]
  - @json-render/core@0.14.1

## 0.14.0

### Patch Changes

- Updated dependencies [a8afd8b]
  - @json-render/core@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [5b32de8]
  - @json-render/core@0.13.0

## 0.12.1

### Patch Changes

- Updated dependencies [54a1ecf]
  - @json-render/core@0.12.1

## 0.12.0

### Minor Changes

- 63c339b: Add Svelte renderer, React Email renderer, and MCP Apps integration.

  ### New:
  - **`@json-render/svelte`** — Svelte 5 renderer with runes-based reactivity. Full support for data binding, visibility, actions, validation, watchers, streaming, and repeat scopes. Includes `defineRegistry`, `Renderer`, `schema`, composables, and context providers.
  - **`@json-render/react-email`** — React Email renderer for generating HTML and plain-text emails from JSON specs. 17 standard components (Html, Head, Body, Container, Section, Row, Column, Heading, Text, Link, Button, Image, Hr, Preview, Markdown). Server-side `renderToHtml` / `renderToPlainText` APIs. Custom catalog and registry support.
  - **`@json-render/mcp`** — MCP Apps integration that serves json-render UIs as interactive apps inside Claude, ChatGPT, Cursor, VS Code, and other MCP-capable clients. `createMcpApp` server factory, `useJsonRenderApp` React hook for iframes, and `buildAppHtml` utility.

  ### Fixed:
  - **`@json-render/svelte`** — Corrected JSDoc comment and added missing `zod` peer dependency.

### Patch Changes

- Updated dependencies [63c339b]
  - @json-render/core@0.12.0

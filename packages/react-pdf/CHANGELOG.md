# @json-render/react-pdf

## 0.11.0

### Patch Changes

- Updated dependencies [3f1e71e]
  - @json-render/core@0.11.0

## 0.10.0

### Patch Changes

- Updated dependencies [9cef4e9]
  - @json-render/core@0.10.0

## 0.9.1

### Patch Changes

- b103676: Fix install failure caused by `@internal/react-state` (a private workspace package) being listed as a published dependency. The internal package is now bundled into each renderer's output at build time, so consumers no longer need to resolve it from npm.
  - @json-render/core@0.9.1

## 0.9.0

### Minor Changes

- 1d755c1: External state store, store adapters, and bug fixes.

  ### New: External State Store

  The `StateStore` interface lets you plug in your own state management (Redux, Zustand, Jotai, XState, etc.) instead of the built-in internal store. Pass a `store` prop to `StateProvider`, `JSONUIProvider`, or `createRenderer` for controlled mode.
  - Added `StateStore` interface and `createStateStore()` factory to `@json-render/core`
  - `StateProvider`, `JSONUIProvider`, and `createRenderer` now accept an optional `store` prop for controlled mode
  - When `store` is provided, it becomes the single source of truth (`initialState`/`onStateChange` are ignored)
  - When `store` is omitted, everything works exactly as before (fully backward compatible)
  - Applied across all platform packages: react, react-native, react-pdf
  - Store utilities (`createStoreAdapter`, `immutableSetByPath`, `flattenToPointers`) available via `@json-render/core/store-utils` for building custom adapters

  ### New: Store Adapter Packages
  - `@json-render/zustand` — Zustand adapter for `StateStore`
  - `@json-render/redux` — Redux / Redux Toolkit adapter for `StateStore`
  - `@json-render/jotai` — Jotai adapter for `StateStore`

  ### Changed: `onStateChange` signature updated (breaking)

  The `onStateChange` callback now receives a single array of changed entries instead of being called once per path:

  ```ts
  // Before
  onStateChange?: (path: string, value: unknown) => void

  // After
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void
  ```

  ### Fixed
  - Fix schema import to use server-safe `@json-render/react/schema` subpath, avoiding `createContext` crashes in Next.js App Router API routes
  - Fix chaining actions in `@json-render/react`, `@json-render/react-native`, and `@json-render/react-pdf`
  - Fix safely resolving inner type for Zod arrays in core schema

### Patch Changes

- Updated dependencies [1d755c1]
  - @json-render/core@0.9.0
  - @internal/react-state@0.8.1

## 0.8.0

### Minor Changes

- 09376db: New `@json-render/react-pdf` package for generating PDF documents from JSON specs.

  ### New: `@json-render/react-pdf`

  PDF renderer for json-render, powered by `@react-pdf/renderer`. Define catalogs and registries the same way as `@json-render/react`, but output PDF documents instead of web UI.
  - `renderToBuffer(spec)` — render a spec to an in-memory PDF buffer
  - `renderToStream(spec)` — render to a readable stream (pipe to HTTP response)
  - `renderToFile(spec, path)` — render directly to a file on disk
  - `defineRegistry` / `createRenderer` — same API as `@json-render/react` for custom components
  - `standardComponentDefinitions` — Zod-based catalog definitions (server-safe via `@json-render/react-pdf/catalog`)
  - `standardComponents` — React PDF implementations for all standard components
  - Server-safe import via `@json-render/react-pdf/server`

  Standard components:
  - **Document structure**: Document, Page
  - **Layout**: View, Row, Column
  - **Content**: Heading, Text, Image, Link
  - **Data**: Table, List
  - **Decorative**: Divider, Spacer
  - **Page-level**: PageNumber

  Includes full context support: state management, visibility conditions, actions, validation, and repeat scopes — matching the capabilities of `@json-render/react`.

### Patch Changes

- Updated dependencies [09376db]
  - @json-render/core@0.8.0

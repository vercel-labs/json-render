# Changelog

## 0.21.0

<!-- release:start -->

### New Features

- **TanStack Start renderer:** Added `@json-render/tanstack-start` for JSON-defined applications with file-based routes, reusable layouts, SSR loaders, head metadata, prerender paths, client navigation, and route fallbacks (#334)
- **Experimental Jev composition:** Added `experimental_composeSpec` and `experimental_createEvaluator` to compose validated specs from app-owned candidates, plus a Jev model option and iterative composition editing in the playground

### Improvements

- **Vue named slots:** Vue registries now support catalog-declared named slots alongside the default `children` slot (#323)
- **React streaming stability:** Stabilized streamed React renders and added coverage for incomplete streamed props and nested prop identities (#325)
- **Documentation and project status:** Expanded renderer, Jev, and package documentation and added Labs status badges to the project README

### Contributors

- @ctate
- @Railly
<!-- release:end -->

## 0.20.0

### New Features

- **Named slots for React:** Components can declare named slots such as `header` and `footer`, while `children` remains the default slot. Slots are preserved through validation, streaming, nested conversion, code export, playground views, and Devtools navigation (#320). Built from the original contribution by @wotnak in #105
- **Nested repeats:** `repeat.statePath` now accepts item-relative paths such as `{ "$item": "employees" }`, enabling nested data rendering across React, React Native, React Email, React PDF, Image, Ink, Solid, Svelte, and Vue (#319). Built from the original contribution by @tmchow in #256
- **Harness chat example:** Added a complete Next.js example using the AI SDK 7 harness adapter, agent delegation, sandbox transport, and json-render components (#302)

### Bug Fixes

- **Chained action params:** Named `onSuccess` and `onError` actions now receive their configured `params` across core and all renderer bridges (#307)
- **Consistent optional visibility:** Element `visible` fields now remain optional across Zod 4 versions, while prompts explicitly require `children` arrays for every element (#299)
- **Spec validation and autofix:** Dangling child references are pruned, malformed visibility conditions are reported, and repeated items can be filtered safely (#300)

### Improvements

- **Release toolchain hardening:** The workspace now requires Node.js 24 and pnpm 11, enforces package engine checks, and applies a minimum package release age (#293)

### Breaking Changes

- Custom renderer bridges that implement the core `executeAction` callback must now accept an `ActionBinding` instead of a bare action name. This exposes chained action params to custom integrations at compile time (#307)

### Contributors

- @ctate
- @Railly
- @tmchow
- @wotnak

## 0.19.0

### New Features

- **Custom directives API** — `@json-render/core` now supports custom directives via `defineDirective`, letting you declare new JSON shapes (like `$format`, `$math`) that resolve to computed values at render time. Directives compose naturally — nest `$format` over `$math` over `$state` and they resolve inside-out. All four renderers (React, Vue, Svelte, Solid) have built-in directive resolution (#279)
- **`@json-render/directives`** — New package shipping seven ready-made directives: `$format` (date, currency, number, percent via `Intl`), `$math` (add, subtract, multiply, divide, mod, min, max, round, floor, ceil, abs), `$concat`, `$count`, `$truncate`, `$pluralize`, and `$join`. Also exports `createI18nDirective` for `$t` translation keys with `{{param}}` interpolation, and `standardDirectives` for one-line registration (#279)

### Improvements

- **Example READMEs** — Added documentation to the chat, dashboard, game-engine, and no-ai examples (#277)

### Contributors

- @ctate

## 0.18.0

### New Features

- **Devtools** — Five new packages for inspecting json-render apps in the browser: `@json-render/devtools` (framework-agnostic core), plus `@json-render/devtools-react`, `@json-render/devtools-vue`, `@json-render/devtools-svelte`, and `@json-render/devtools-solid` adapters. Drop `<JsonRenderDevtools />` into your app to get a shadow-DOM-isolated panel with six tabs (Spec, State, Actions, Stream, Catalog, Pick), a DOM picker that maps clicked elements back to spec keys via `data-jr-key`, a capped event store, and server-side stream tap utilities. Floating toggle or `Cmd`/`Ctrl` + `Shift` + `J`, tree-shakes to `null` in production (#273)
- **Devtools example** — New `examples/devtools` Next.js demo showing the full devtools panel wired up to an AI chat endpoint and a component catalog (#273)
- **Action observer and devtools flag in core** — `@json-render/core` now exposes an action observer and a devtools enablement flag that adapters use to mirror actions and stream events into the panel (#273)

### Bug Fixes

- **Zod 4 schema formatting** — `formatZodType` now correctly handles `z.record()`, `z.default()`, and `z.literal()` types from Zod 4, which previously produced incorrect or empty output in generated prompts and schemas (#239)

### Improvements

- **Zod 4 test coverage** — Added unit tests for `formatZodType` covering record, default, and literal types to guard against regressions (#272)

### Contributors

- @ctate
- @mvanhorn

## 0.17.0

### New Features

- **Gaussian Splatting** — Added `GaussianSplat` component to `@json-render/react-three-fiber`, bringing the component count to 20. Composable with all existing R3F components (lights, controls, post-processing) via drei's Splat loader (#259)
- **Standalone gsplat example** — Experimental demo app showcasing Gaussian Splatting with gsplat.js (no Three.js dependency), featuring scene selector, live JSON spec viewer, and progress indicator (#259)
- **R3F gsplat example** — Demo app with five scenes: splat showroom, splat with primitives, multi-splat, post-processing effects, and animated floating splat (#259)

### Improved

- **AI output quality** — Improved prompt output and schema generation for more reliable AI-generated specs (#268)

### Contributors

- @ctate
- @willmanzoli

## 0.16.0

### Improved

- **Release process** — Switched from Changesets to a manual single-PR release workflow with changelog markers and automatic npm publish on version bump

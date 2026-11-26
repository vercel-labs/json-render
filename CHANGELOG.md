# Changelog

## 0.23.2

<!-- release:start -->

### Bug Fixes

- **Chat stream errors:** The `CardSpecError` thrown by `streamCard` for an invalid final spec now carries the posted message as `postedMessage`, so callers can edit or remove the partial card (#483)

### Contributors

- @Railly
- @sachinmour

<!-- release:end -->

## 0.23.1

### Bug Fixes

- **Swift render tree limits:** Bound the child ids a build holds, so a spec that lists the same child many times with a long state value stops at a limit instead of holding a copy of that value once per child. Bound the issues the validator reports and the message bytes they hold, and end a shortened result with one `specTooComplex` issue that keeps its severity, so a spec whose only dropped issues were warnings stays valid (#477)

### Improvements

- **Swift package installation:** Made the repository root a Swift package, so Xcode and SwiftPM can add `JSONRender` by URL from 0.23.1 on, with the `JSONRenderCore`, `JSONRenderSwiftUI`, and `JSONRenderCatalog` products. The nested package at `swift/JSONRender` remains for local checkouts (#478)

### Contributors

- @ctate

## 0.23.0

### New Features

- **Swift package and SwiftUI renderer:** Added a `JSONRender` Swift package with a `JSONRenderCore` model for specs, streaming, state, expressions, actions, visibility, and validation, a `JSONRenderSwiftUI` renderer with built-in views, a native catalog, and macOS and streaming example apps. Conformance fixtures compare the Swift render tree with the React renderer, and CI builds and tests the package (#470)

### Bug Fixes

- **Spec replay:** Deep-copy message parts before replaying so repeated replays no longer mutate the parts or duplicate state items and children in React, Vue, Solid, Svelte, and Devtools. Devtools also skips malformed spec parts instead of crashing (#453)
- **Spec fences:** Reset unfinished spec fences at text block boundaries so prose after an interrupted fence is no longer dropped by the core and YAML transforms (#426)
- **Code generation:** Emit string props as JSX expressions so quotes, backslashes, and newlines survive code export (#427)
- **Email validation:** Ignore surrounding whitespace in the email validator, matching the URL and required checks (#430)
- **Numeric validation:** Accept numeric strings for `min` and `max`, using the same parser and rules as the `numeric` check (#429)

### Documentation

- Corrected the **Next.js quick start** to use `getPageData` from `createNextApp` and to move `NextAppProvider` into a client layout (#428)

### Contributors

- @ctate
- @Railly
- @lahfir
- @kevin9327
- @ken8203
- @KennyMcSimpson
- @WhyTan00
- @Jassi2004

## 0.22.0

### New Features

- **Chat SDK renderer:** Added `@json-render/chat` to render specs as Chat SDK cards, so one catalog posts natively on Slack, Teams, and the other Chat SDK platforms. `streamCard` streams a card into a thread and edits it as elements arrive, and `toCard` validates specs against per-component schemas and optional platform limits. State expressions, `visible`, and `repeat` resolve against `spec.state` (#451)
- **Chat SDK example:** Added a playground that previews generated messages as Slack renders them, with a Teams Adaptive Card view and a copy button for Block Kit Builder (#451)

### Contributors

- @Railly

## 0.21.4

### Documentation

- Added the **eve TanStack Agent template** to the examples page, with links to its source repository and Vercel template (#442)
- Added shared **technical writing guidance** for documentation changes (#441)

### Contributors

- @bensabic


## 0.21.3

### Bug Fixes

- **YAML patch state:** Keep move and copy operations in sync with later YAML edits, isolate copied and emitted values, and bound copy growth (#411)
- **JSON Pointer paths:** Keep path helpers on own properties and dense arrays, ignoring inherited paths and out-of-range array indexes (#411)
- **Repeated stream operations:** Apply every SpecStream JSONL line, including repeated append operations (#414)
- **Chat example styling:** Correct Tailwind source paths so chat examples include Streamdown and shadcn styles (#415)
- **shadcn skill installation:** Rename the skill to `json-render-shadcn` to avoid replacing the official shadcn skill (#417)

### Documentation

- Correct **Solid registry and reactive input examples** across guides, API references, and package documentation (#413)
- Document **mixed message part ordering** and the aggregation behavior of `useJsonRenderMessage` (#416)
- Document **published Jev composition APIs** with exact-version npm installation instructions (#418)

### Contributors

- @lahfir
- @dajiaohuang
- @Jassi2004
- @xiehuanyi
- @kevin9327
- @adhamali450
- @monsterlag
- @Bortlesboat

## 0.21.2

### Bug Fixes

- **Code generation:** Quote non-identifier object keys and preserve `__proto__` as an own property when serializing props (#407)
- **Production devtools:** Honor production bundle replacements for `process.env.NODE_ENV` so devtools stay disabled without a browser `process` global (#408)
- **PDF repeats:** Render repeat containers once, including empty repeats, across server-side PDF output methods (#409)
- **React registry actions:** Run actions with a no-op setter when no state setter is available (#410)

### Contributors

- @lahfir
- @dajiaohuang
- @Jassi2004
- @xiehuanyi
- @peter-cynomi
- @Yi-111-a

## 0.21.1

### Bug Fixes

- **Dotted form values:** Preserve literal emails, URLs, and version strings in form value lookups instead of treating them as missing state paths (#353)
- **Numeric validation:** Reject partially numeric strings such as `"123abc"`, empty strings, and whitespace-only strings instead of accepting them as numbers (#389)
- **Schema type inference:** Infer `s.any()` fields as `any`, matching `z.any()`, so validated specs remain assignable to `Spec` without casts (#390)

### Documentation

- Migrated the **docs site** to Geistdocs while preserving public URLs, page content, and anchors (#340)
- Updated **native WebMCP discovery and search** with the Geistdocs MCP adapter (#363)

### Contributors

- @ctate
- @Railly
- @fix2015
- @kevin9327
- @tmchow

## 0.21.0

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

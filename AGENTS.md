# AGENTS.md

Instructions for AI coding agents working with this codebase.

## Package Management

**Always check the latest version before installing a package.**

Before adding or updating any dependency, verify the current latest version on npm:

```bash
npm view <package-name> version
```

Or check multiple packages at once:

```bash
npm view ai version
npm view @ai-sdk/provider-utils version
npm view zod version
```

This ensures we don't install outdated versions that may have incompatible types or missing features.

## Code Style

- Do not use emojis in code or UI
- Use shadcn CLI to add shadcn/ui components: `pnpm dlx shadcn@latest add <component>`
- **Web app docs (`apps/web/`):** Never use Markdown table syntax (`| col | col |`). Always use HTML `<table>` with `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`. Markdown tables do not render correctly in the web app. Inside HTML table cells, curly braces must be escaped as JSX expressions (e.g. `<code>{'{ "$state": "/path" }'}</code>`) because MDX parses `{` as a JSX expression boundary.

## AI SDK / AI Gateway

When using the Vercel AI SDK (`ai` package) with AI Gateway, pass the model as a plain string identifier -- do not import a provider constructor:

```ts
import { streamText } from "ai";

const result = streamText({
  model: "anthropic/claude-haiku-4.5",
  prompt: "...",
});
```

This requires `AI_GATEWAY_API_KEY` to be set in the environment. See `tests/e2e/` for examples.

## Dev Servers

All apps and examples with dev servers use [portless](https://github.com/vercel-labs/portless) to avoid hardcoded ports. Portless assigns random ports and exposes each app via `.localhost` URLs.

Naming convention:
- Main web app: `json-render` → `json-render.localhost:1355`
- Examples: `[name]-demo.json-render` → `[name]-demo.json-render.localhost:1355`

When adding a new example that runs a dev server, wrap its `dev` script with `portless <name>`:

```json
{
  "scripts": {
    "dev": "portless my-example-demo.json-render next dev --turbopack"
  }
}
```

Do **not** add `--port` flags -- portless handles port assignment automatically. Do **not** add portless as a project dependency; it must be installed globally.

## Workflow

- Run `pnpm type-check` after each turn to ensure type safety
- Documentation lives in `apps/web/content/docs/` and uses Geistdocs frontmatter. Keep public `/docs` URLs, heading IDs, `lib/page-titles.ts`, `lib/docs-navigation.ts`, and the content `meta.json` files in sync.
- For docs routing or infrastructure changes, run `pnpm turbo run build --filter='web^...'`, `pnpm --filter web build`, and `pnpm --filter web test:routes`. Existing-page source and Markdown parity are covered by `apps/web/tests/fixtures/docs-baseline.json`; update fixtures only when intentionally changing the documented content.
- When making user-facing changes (new packages, API changes, new features, renamed exports, changed behavior), update the relevant documentation:
  - Package `README.md` files in `packages/*/README.md`
  - Root `README.md` (if packages table, install commands, or examples are affected)
  - Web app docs in `apps/web/` (if guides, API references, or examples need updating)
  - Skills in `skills/*/SKILL.md` (if the package has a corresponding skill)
  - `AGENTS.md` (if workflow or conventions change)

## Releasing

Releases are manual, single-PR affairs. The maintainer controls the changelog voice and format.

All public `@json-render/*` packages share the same version. The canonical version lives in `packages/core/package.json`.

### Preparing a release

When asked to prepare a release (e.g. "prepare v0.17.0"):

1. Create a branch (e.g. `prepare-v0.17.0`)
2. Bump the version in `packages/core/package.json`
3. Run `pnpm run version:sync` to update all other `@json-render/*` packages
4. Write the changelog entry in `CHANGELOG.md`, wrapped in `<!-- release:start -->` and `<!-- release:end -->` markers (move the markers from the previous entry to the new one)
5. **Fill documentation gaps** — every public package should have:
   - A row in the root `README.md` packages table
   - A renderer section in the root `README.md` (if it's a renderer)
   - An API reference page at `apps/web/content/docs/api/<name>.mdx`
   - An entry in `apps/web/lib/page-titles.ts` and `apps/web/lib/docs-navigation.ts`
   - An entry in the docs-chat system prompt (`apps/web/app/api/docs-chat/route.ts`)
   - A skill at `skills/<name>/SKILL.md`
   - A `packages/<name>/README.md`
6. **Run `pnpm type-check`** after all changes to verify nothing is broken
7. Open a PR and merge to `main`

CI compares the `@json-render/core` version to what's on npm. If it differs, it builds, publishes all public packages, and creates the GitHub release automatically. The release body is extracted from the content between the markers.

### Scripts

- `pnpm run version:sync` — sync all `@json-render/*` package versions to match `@json-render/core`
- `pnpm run version:check` — verify all versions are in sync (runs in CI)
- `pnpm run ci:publish` — build all packages and publish to npm (CI only)

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->

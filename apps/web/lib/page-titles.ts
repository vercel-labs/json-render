/**
 * Single source of truth for page titles.
 * Used by both page metadata exports and the OG image route.
 *
 * Keys mirror the page's URL path (e.g., "docs/changelog" → /og/docs/changelog).
 * Values are display titles (without the "| json-render" suffix — the layout template adds that).
 */
export const PAGE_TITLES: Record<string, string> = {
  // Home (no slug)
  "": "The Generative UI\nFramework",

  // Top-level
  playground: "Playground",

  // Docs
  docs: "Introduction",
  "docs/quick-start": "Quick Start",
  "docs/installation": "Installation",
  "docs/catalog": "Catalog",
  "docs/schemas": "Schemas",
  "docs/specs": "Specs",
  "docs/registry": "Registry",
  "docs/streaming": "Streaming",
  "docs/validation": "Validation",
  "docs/data-binding": "Data Binding",
  "docs/computed-values": "Computed Values",
  "docs/visibility": "Visibility",
  "docs/watchers": "Watchers",
  "docs/generation-modes": "Generation Modes",
  "docs/code-export": "Code Export",
  "docs/custom-schema": "Custom Schema & Renderer",
  "docs/ai-sdk": "AI SDK Integration",
  "docs/adaptive-cards": "Adaptive Cards Integration",
  "docs/openapi": "OpenAPI Integration",
  "docs/a2ui": "A2UI Integration",
  "docs/ag-ui": "AG-UI Integration",
  "docs/migration": "Migration Guide",
  "docs/changelog": "Changelog",

  // API references
  "docs/api/core": "@json-render/core API",
  "docs/api/react": "@json-render/react API",
  "docs/api/vue": "@json-render/vue API",
  "docs/api/react-pdf": "@json-render/react-pdf API",
  "docs/api/react-native": "@json-render/react-native API",
  "docs/api/codegen": "@json-render/codegen API",
  "docs/api/remotion": "@json-render/remotion API",
  "docs/api/shadcn": "@json-render/shadcn API",
};

/**
 * Get the page title for a given slug.
 * Returns null if the slug is not in the whitelist.
 */
export function getPageTitle(slug: string): string | null {
  return slug in PAGE_TITLES ? PAGE_TITLES[slug]! : null;
}

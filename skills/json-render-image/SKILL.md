---
name: json-render-image
description: Image renderer for json-render that turns JSON specs into SVG and PNG images via Satori. Use when working with @json-render/image, generating OG images from JSON, creating social cards, or rendering AI-generated image specs.
---

# @json-render/image

Image renderer that converts JSON specs into SVG and PNG images using Satori.

## Quick Start

```typescript
import { renderToPng } from "@json-render/image/render";
import type { Spec } from "@json-render/core";

const spec: Spec = {
  root: "frame",
  elements: {
    frame: {
      type: "Frame",
      props: { width: 1200, height: 630, backgroundColor: "#1a1a2e" },
      children: ["heading"],
    },
    heading: {
      type: "Heading",
      props: { text: "Hello World", level: "h1", color: "#ffffff" },
      children: [],
    },
  },
};

const png = await renderToPng(spec, {
  fonts: [{ name: "Inter", data: fontData, weight: 400, style: "normal" }],
});
```

## Using Standard Components

```typescript
import { defineCatalog } from "@json-render/core";
import { schema, standardComponentDefinitions } from "@json-render/image";

export const imageCatalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});
```

## Adding Custom Components

```typescript
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    Badge: {
      props: z.object({ label: z.string(), color: z.string().nullable() }),
      slots: [],
      description: "A colored badge label",
    },
  },
});
```

## Standard Components

| Component | Category | Description |
|-----------|----------|-------------|
| `Frame` | Root | Root container. Defines width, height, background. Must be root. |
| `Box` | Layout | Container with padding, margin, border, absolute positioning |
| `Row` | Layout | Horizontal flex layout |
| `Column` | Layout | Vertical flex layout |
| `Heading` | Content | h1-h4 heading text |
| `Text` | Content | Body text with full styling |
| `Image` | Content | Image from URL |
| `Divider` | Decorative | Horizontal line separator |
| `Spacer` | Decorative | Empty vertical space |

## Key Exports

| Export | Purpose |
|--------|---------|
| `renderToSvg` | Render spec to SVG string |
| `renderToPng` | Render spec to PNG buffer (requires `@resvg/resvg-js`) |
| `schema` | Image element schema |
| `standardComponents` | Pre-built component registry |
| `standardComponentDefinitions` | Catalog definitions for AI prompts |

## Sub-path Exports

| Export | Description |
|--------|-------------|
| `@json-render/image` | Full package: schema, components, render functions |
| `@json-render/image/server` | Schema and catalog definitions only (no React/Satori) |
| `@json-render/image/catalog` | Standard component definitions and types |
| `@json-render/image/render` | Render functions only |

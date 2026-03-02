# @json-render/image

Image renderer for `@json-render/core`. Generate SVG and PNG images from JSON specs using [Satori](https://github.com/vercel/satori).

## Install

```bash
npm install @json-render/core @json-render/image
```

For PNG output, also install the optional peer dependency:

```bash
npm install @resvg/resvg-js
```

## Quick Start

### Render a spec to SVG

```typescript
import { renderToSvg } from "@json-render/image/render";
import type { Spec } from "@json-render/core";

const spec: Spec = {
  root: "frame",
  elements: {
    frame: {
      type: "Frame",
      props: { width: 1200, height: 630, backgroundColor: "#1a1a2e" },
      children: ["heading", "subtitle"],
    },
    heading: {
      type: "Heading",
      props: { text: "Hello World", level: "h1", color: "#ffffff" },
      children: [],
    },
    subtitle: {
      type: "Text",
      props: { text: "Generated from JSON", fontSize: 24, color: "#a0a0b0" },
      children: [],
    },
  },
};

const svg = await renderToSvg(spec, {
  fonts: [
    {
      name: "Inter",
      data: await fetch("https://example.com/Inter-Regular.ttf").then((r) =>
        r.arrayBuffer()
      ),
      weight: 400,
      style: "normal",
    },
  ],
});
```

### Render to PNG

```typescript
import { renderToPng } from "@json-render/image/render";

const png = await renderToPng(spec, {
  fonts: [
    {
      name: "Inter",
      data: await readFile("./Inter-Regular.ttf"),
      weight: 400,
      style: "normal",
    },
  ],
});

// Write to file
await writeFile("output.png", png);
```

### With a custom catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema, renderToSvg } from "@json-render/image";
import { standardComponentDefinitions } from "@json-render/image/catalog";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    Badge: {
      props: z.object({
        label: z.string(),
        color: z.string().nullable(),
      }),
      slots: [],
      description: "A colored badge label",
    },
  },
});
```

## Standard Components

### Root

| Component | Description |
|-----------|-------------|
| `Frame` | Root image container. Defines width, height, and background. Must be the root element. |

### Layout

| Component | Description |
|-----------|-------------|
| `Box` | Generic container with padding, margin, background, border, and flex alignment. |
| `Row` | Horizontal flex layout with gap, align, justify. |
| `Column` | Vertical flex layout with gap, align, justify. |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | h1-h4 heading text with color and alignment. |
| `Text` | Body text with fontSize, color, weight, style, and alignment. |
| `Image` | Image from a URL with width, height, and borderRadius. |

### Decorative

| Component | Description |
|-----------|-------------|
| `Divider` | Horizontal line separator. |
| `Spacer` | Empty vertical space. |

## Server-Side APIs

```typescript
import { renderToSvg, renderToPng } from "@json-render/image/render";

// Render to an SVG string
const svg = await renderToSvg(spec, { fonts });

// Render to a PNG buffer (requires @resvg/resvg-js)
const png = await renderToPng(spec, { fonts });
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts` | `SatoriOptions['fonts']` | `[]` | Font data for text rendering |
| `width` | `number` | Frame prop | Override image width |
| `height` | `number` | Frame prop | Override image height |
| `registry` | `Record<string, Component>` | `{}` | Custom component overrides |
| `includeStandard` | `boolean` | `true` | Include standard components |
| `state` | `Record<string, unknown>` | `{}` | Initial state values |

## Server-Safe Import

Import schema and catalog definitions without pulling in React or Satori:

```typescript
import { schema, standardComponentDefinitions } from "@json-render/image/server";
```

## License

Apache-2.0

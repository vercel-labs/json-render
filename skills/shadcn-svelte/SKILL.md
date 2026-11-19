---
name: shadcn-svelte
description: Pre-built shadcn-svelte components for json-render Svelte apps. Use when working with @json-render/shadcn-svelte, adding standard UI components to a Svelte catalog, or building Svelte web UIs with shadcn-svelte + Tailwind CSS components.
---

# @json-render/shadcn-svelte

Pre-built shadcn-svelte component definitions and implementations for json-render. Provides 36 components built on Svelte 5 + Tailwind CSS.

## Two Entry Points

| Entry Point | Exports | Use For |
|-------------|---------|---------|
| `@json-render/shadcn-svelte/catalog` | `shadcnComponentDefinitions` | Catalog schemas (no Svelte dependency, safe for server) |
| `@json-render/shadcn-svelte` | `shadcnComponents`, `shadcnComponentDefinitions` | Svelte implementations + catalog schemas |

## Usage Pattern

Pick the components you need from the standard definitions. Do not spread all definitions -- explicitly select what your app uses:

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/svelte/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn-svelte/catalog";
import { defineRegistry } from "@json-render/svelte";
import { shadcnComponents } from "@json-render/shadcn-svelte";

// Catalog: pick definitions
const catalog = defineCatalog(schema, {
  components: {
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Button: shadcnComponentDefinitions.Button,
    Input: shadcnComponentDefinitions.Input,
  },
  actions: {},
});

// Registry: pick matching implementations
const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Button: shadcnComponents.Button,
    Input: shadcnComponents.Input,
  },
});
```

Then render in your Svelte component:

```svelte
<script lang="ts">
  import { Renderer, JsonUIProvider } from "@json-render/svelte";

  export let spec;
  export let registry;
</script>

<JsonUIProvider initialState={spec?.state ?? {}}>
  <Renderer {spec} {registry} />
</JsonUIProvider>
```

## Available Components

### Layout
- **Card** - Container with optional title, description, maxWidth, centered
- **Stack** - Flex container with direction, gap, align, justify
- **Grid** - Grid layout with columns (number) and gap
- **Separator** - Visual divider with orientation

### Navigation
- **Tabs** - Tabbed navigation with tabs array, defaultValue, value
- **Accordion** - Collapsible sections with items array and type (single/multiple)
- **Collapsible** - Single collapsible section with title
- **Pagination** - Page navigation with totalPages and page

### Overlay
- **Dialog** - Modal dialog with title, description, openPath
- **Drawer** - Bottom drawer with title, description, openPath
- **Tooltip** - Hover tooltip with content and text
- **Popover** - Click-triggered popover with trigger and content
- **DropdownMenu** - Dropdown with label and items array

### Content
- **Heading** - Heading text with level (h1-h4)
- **Text** - Paragraph with variant (body, caption, muted, lead, code)
- **Image** - Image with alt, width, height
- **Avatar** - User avatar with src, name, size
- **Badge** - Status badge with text and variant (default, secondary, destructive, outline)
- **Alert** - Alert banner with title, message, type (success, warning, info, error)
- **Carousel** - Scrollable carousel with items array
- **Table** - Data table with columns (string[]) and rows (string[][])

### Feedback
- **Progress** - Progress bar with value, max, label
- **Skeleton** - Loading placeholder with width, height, rounded
- **Spinner** - Loading spinner with size and label

### Input
- **Button** - Button with label, variant (primary, secondary, danger), disabled
- **Link** - Anchor link with label, href, target (_self, _blank)
- **Input** - Text input with label, name, type, placeholder, value, checks
- **Textarea** - Multi-line input with label, name, placeholder, rows, value, checks
- **Select** - Dropdown select with label, name, options (string[]), value, checks
- **Checkbox** - Checkbox with label, name, checked, checks, validateOn
- **Radio** - Radio group with label, name, options (string[]), value, checks, validateOn
- **Switch** - Toggle switch with label, name, checked, checks, validateOn
- **Slider** - Range slider with label, min, max, step, value
- **Toggle** - Toggle button with label, pressed, variant
- **ToggleGroup** - Group of toggles with items, type, value
- **ButtonGroup** - Button group with buttons array and selected

## Validation Timing (`validateOn`)

All form components support `validateOn` to control when validation runs:
- `"change"` -- validate on every input change (default for Select, Checkbox, Radio, Switch)
- `"blur"` -- validate when field loses focus (default for Input, Textarea)
- `"submit"` -- validate only on form submission

## Important Notes

- The `/catalog` entry point has no Svelte dependency -- use it for server-side prompt generation
- Components use Tailwind CSS classes -- your app must have Tailwind configured
- Component implementations use bundled shadcn-svelte primitives (not your app's `$lib/components/ui/`)
- All form inputs support `checks` for validation (type + message pairs) and `validateOn` for timing
- Events: inputs emit `change`/`submit`/`focus`/`blur`; buttons emit `press`; selects emit `change`/`select`

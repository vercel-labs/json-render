# @json-render/image

## 0.15.0

### Patch Changes

- Updated dependencies [bf3a7ec]
  - @json-render/core@0.15.0

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

### Patch Changes

- Updated dependencies [63c339b]
  - @json-render/core@0.12.0

## 0.11.0

### Minor Changes

- 3f1e71e: Image renderer: generate SVG and PNG from JSON specs.

  ### New: `@json-render/image` Package

  Server-side image renderer powered by Satori. Turns the same `{ root, elements }` spec format into SVG or PNG output for OG images, social cards, and banners.
  - `renderToSvg(spec, options)` — render spec to SVG string
  - `renderToPng(spec, options)` — render spec to PNG buffer (requires `@resvg/resvg-js`)
  - 9 standard components: Frame, Box, Row, Column, Heading, Text, Image, Divider, Spacer
  - `standardComponentDefinitions` catalog for AI prompt generation
  - Server-safe import path: `@json-render/image/server`
  - Sub-path exports: `/render`, `/catalog`, `/server`

### Patch Changes

- Updated dependencies [3f1e71e]
  - @json-render/core@0.11.0

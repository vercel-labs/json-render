# @json-render/gsplat

## 0.1.0

### Minor Changes

- Initial release of `@json-render/gsplat` — standalone Gaussian Splatting renderer for json-render.
  - `GaussianSplat` component for loading `.splat` and `.ply` files
  - `GaussianSplatViewer` container with built-in orbit controls, auto-rotate, and loading state
  - Full Zod-based catalog definitions for AI-driven spec generation
  - Lazy-loaded renderer powered by Hugging Face's `gsplat` (standalone WebGL, no Three.js)
  - Demo assets from Hugging Face public splat datasets

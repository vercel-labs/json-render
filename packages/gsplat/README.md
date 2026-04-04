# @json-render/gsplat

Standalone Gaussian Splatting renderer for [@json-render/core](https://github.com/vercel-labs/json-render). Load and display `.splat` and `.ply` files from JSON specs.

## Installation

```bash
npm install @json-render/gsplat @json-render/core react react-dom zod
```

## Quick Start

```tsx
import { GaussianSplatViewerComponent } from "@json-render/gsplat";

function App() {
  return (
    <GaussianSplatViewerComponent
      props={{
        width: "100%",
        height: "100vh",
        controls: true,
        autoRotate: true,
        cameraPosition: [0, 2, 5],
        cameraTarget: [0, 0, 0],
        fov: 50,
      }}
      splats={[
        {
          src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat",
          position: [0, 0, 0],
        },
      ]}
    />
  );
}
```

## Components

| Component | Description |
|-----------|-------------|
| `GaussianSplat` | Loads and renders a `.splat` or `.ply` gaussian splat file |
| `GaussianSplatViewer` | Canvas container with built-in orbit controls, auto-rotate, and loading state |

## Catalog Integration

Use with `defineCatalog` for AI-driven spec generation:

```tsx
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry } from "@json-render/react";
import { gsplatComponentDefinitions, gsplatComponents } from "@json-render/gsplat";

const catalog = defineCatalog(schema, {
  components: { ...gsplatComponentDefinitions },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: { ...gsplatComponents },
});
```

## vs. React Three Fiber

This package provides a **standalone** gaussian splat viewer — no Three.js required.

If you need to compose gaussian splats with other 3D objects (meshes, lights, models), use the `GaussianSplat` component from [`@json-render/react-three-fiber`](../react-three-fiber) instead.

## License

Apache-2.0

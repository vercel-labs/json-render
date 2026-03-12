# @json-render/react-three-fiber

React Three Fiber renderer for [`@json-render/core`](https://json-render.dev). JSON becomes 3D scenes.

19 built-in components for meshes, lights, models, environments, text, cameras, and controls.

## Installation

```bash
npm install @json-render/react-three-fiber @json-render/core @json-render/react @react-three/fiber @react-three/drei three zod
```

## Usage

```tsx
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry } from "@json-render/react";
import {
  threeComponentDefinitions,
  threeComponents,
  ThreeCanvas,
} from "@json-render/react-three-fiber";

// Build catalog with 3D components
const catalog = defineCatalog(schema, {
  components: {
    Box: threeComponentDefinitions.Box,
    Sphere: threeComponentDefinitions.Sphere,
    AmbientLight: threeComponentDefinitions.AmbientLight,
    DirectionalLight: threeComponentDefinitions.DirectionalLight,
    OrbitControls: threeComponentDefinitions.OrbitControls,
  },
  actions: {},
});

// Register implementations
const { registry } = defineRegistry(catalog, {
  components: {
    Box: threeComponents.Box,
    Sphere: threeComponents.Sphere,
    AmbientLight: threeComponents.AmbientLight,
    DirectionalLight: threeComponents.DirectionalLight,
    OrbitControls: threeComponents.OrbitControls,
  },
});

// Render
<ThreeCanvas
  spec={spec}
  registry={registry}
  shadows
  camera={{ position: [5, 5, 5], fov: 50 }}
  style={{ width: "100%", height: "100vh" }}
/>;
```

## Components

**Primitives:** Box, Sphere, Cylinder, Cone, Torus, Plane, Capsule

**Lights:** AmbientLight, DirectionalLight, PointLight, SpotLight

**Container:** Group

**Model:** Model (GLTF/GLB)

**Environment:** Environment, Fog, GridHelper

**Text:** Text3D

**Camera/Controls:** PerspectiveCamera, OrbitControls

## Docs

Full API reference: [json-render.dev/docs/api/react-three-fiber](https://json-render.dev/docs/api/react-three-fiber)

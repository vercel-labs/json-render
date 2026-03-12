---
name: react-three-fiber
description: React Three Fiber 3D renderer for json-render. Use when working with @json-render/react-three-fiber, building 3D scenes from JSON specs, rendering meshes/lights/models/environments, or integrating Three.js with json-render catalogs.
---

# @json-render/react-three-fiber

React Three Fiber renderer for json-render. 19 built-in 3D components.

## Two Entry Points

| Entry Point | Exports | Use For |
|-------------|---------|---------|
| `@json-render/react-three-fiber/catalog` | `threeComponentDefinitions` | Catalog schemas (no R3F dependency, safe for server) |
| `@json-render/react-three-fiber` | `threeComponents`, `ThreeRenderer`, `ThreeCanvas`, schemas | R3F implementations and renderer |

## Usage Pattern

Pick the 3D components you need from the standard definitions:

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { threeComponentDefinitions } from "@json-render/react-three-fiber/catalog";
import { defineRegistry } from "@json-render/react";
import { threeComponents, ThreeCanvas } from "@json-render/react-three-fiber";

// Catalog: pick definitions
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

// Registry: pick matching implementations
const { registry } = defineRegistry(catalog, {
  components: {
    Box: threeComponents.Box,
    Sphere: threeComponents.Sphere,
    AmbientLight: threeComponents.AmbientLight,
    DirectionalLight: threeComponents.DirectionalLight,
    OrbitControls: threeComponents.OrbitControls,
  },
});
```

## Rendering

### ThreeCanvas (convenience wrapper)

```tsx
<ThreeCanvas
  spec={spec}
  registry={registry}
  shadows
  camera={{ position: [5, 5, 5], fov: 50 }}
  style={{ width: "100%", height: "100vh" }}
/>
```

### Manual Canvas setup

```tsx
import { Canvas } from "@react-three/fiber";
import { ThreeRenderer } from "@json-render/react-three-fiber";

<Canvas shadows>
  <ThreeRenderer spec={spec} registry={registry}>
    {/* Additional R3F elements */}
  </ThreeRenderer>
</Canvas>
```

## Available Components (19)

### Primitives (7)
- `Box` -- width, height, depth, material
- `Sphere` -- radius, widthSegments, heightSegments, material
- `Cylinder` -- radiusTop, radiusBottom, height, material
- `Cone` -- radius, height, material
- `Torus` -- radius, tube, material
- `Plane` -- width, height, material
- `Capsule` -- radius, length, material

All primitives share: `position`, `rotation`, `scale`, `castShadow`, `receiveShadow`, `material`.

### Lights (4)
- `AmbientLight` -- color, intensity
- `DirectionalLight` -- position, color, intensity, castShadow
- `PointLight` -- position, color, intensity, distance, decay
- `SpotLight` -- position, color, intensity, angle, penumbra

### Other (8)
- `Group` -- container with position/rotation/scale, supports children
- `Model` -- GLTF/GLB loader via url prop
- `Environment` -- HDRI environment map (preset, background, blur, intensity)
- `Fog` -- linear fog (color, near, far)
- `GridHelper` -- reference grid (size, divisions, color)
- `Text3D` -- SDF text (text, fontSize, color, anchorX, anchorY)
- `PerspectiveCamera` -- camera (position, fov, near, far, makeDefault)
- `OrbitControls` -- orbit controls (enableDamping, enableZoom, autoRotate)

## Shared Schemas

Reusable Zod schemas for custom 3D catalog definitions:

```typescript
import { vector3Schema, materialSchema, transformProps, shadowProps } from "@json-render/react-three-fiber";
import { z } from "zod";

// Custom 3D component
const myComponentDef = {
  props: z.object({
    ...transformProps,
    ...shadowProps,
    material: materialSchema.nullable(),
    myCustomProp: z.string(),
  }),
  description: "My custom 3D component",
};
```

## Material Schema

```typescript
materialSchema = z.object({
  color: z.string().nullable(),         // default "#ffffff"
  metalness: z.number().nullable(),     // default 0
  roughness: z.number().nullable(),     // default 1
  emissive: z.string().nullable(),      // default "#000000"
  emissiveIntensity: z.number().nullable(), // default 1
  opacity: z.number().nullable(),       // default 1
  transparent: z.boolean().nullable(),  // default false
  wireframe: z.boolean().nullable(),    // default false
});
```

## Spec Format

3D specs use the standard json-render flat element format:

```json
{
  "root": "scene",
  "elements": {
    "scene": {
      "type": "Group",
      "props": { "position": [0, 0, 0] },
      "children": ["light", "box"]
    },
    "light": {
      "type": "AmbientLight",
      "props": { "intensity": 0.5 },
      "children": []
    },
    "box": {
      "type": "Box",
      "props": {
        "position": [0, 0.5, 0],
        "material": { "color": "#4488ff", "metalness": 0.3, "roughness": 0.7 }
      },
      "children": []
    }
  }
}
```

## Dependencies

Peer dependencies required:
- `@react-three/fiber` >= 8.0.0
- `@react-three/drei` >= 9.0.0
- `three` >= 0.160.0
- `react` ^19.0.0
- `zod` ^4.0.0

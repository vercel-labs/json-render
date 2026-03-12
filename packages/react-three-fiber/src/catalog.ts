import { z } from "zod";
import {
  vector3Schema,
  materialSchema,
  transformProps,
  shadowProps,
} from "./schemas";

/**
 * React Three Fiber component definitions for json-render catalogs.
 *
 * These can be used directly or extended with custom 3D components.
 * All components render as React Three Fiber elements.
 */
export const threeComponentDefinitions = {
  // ===========================================================================
  // Primitives
  // ===========================================================================

  Box: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      depth: z.number().nullable(),
    }),
    description:
      "Box mesh. Defaults to 1x1x1. Use material for appearance, transform props for placement.",
    example: {
      position: [0, 0.5, 0],
      material: { color: "#4488ff" },
    },
  },

  Sphere: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      radius: z.number().nullable(),
      widthSegments: z.number().nullable(),
      heightSegments: z.number().nullable(),
    }),
    description: "Sphere mesh. Defaults to radius 1.",
    example: {
      position: [0, 1, 0],
      radius: 0.5,
      material: { color: "#ff4444" },
    },
  },

  Cylinder: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      radiusTop: z.number().nullable(),
      radiusBottom: z.number().nullable(),
      height: z.number().nullable(),
      radialSegments: z.number().nullable(),
    }),
    description: "Cylinder mesh. Use radiusTop/radiusBottom for tapering.",
    example: {
      position: [0, 0.5, 0],
      height: 1,
      material: { color: "#44ff44" },
    },
  },

  Cone: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      radius: z.number().nullable(),
      height: z.number().nullable(),
      radialSegments: z.number().nullable(),
    }),
    description: "Cone mesh.",
    example: {
      position: [0, 0.5, 0],
      material: { color: "#ffaa00" },
    },
  },

  Torus: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      radius: z.number().nullable(),
      tube: z.number().nullable(),
      radialSegments: z.number().nullable(),
      tubularSegments: z.number().nullable(),
    }),
    description: "Torus (donut) mesh.",
    example: {
      position: [0, 1, 0],
      material: { color: "#ff44ff" },
    },
  },

  Plane: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Flat plane mesh. Useful for floors/walls. Defaults to XY plane; rotate [-Math.PI/2, 0, 0] for ground. Pass MeshPortalMaterial as child for portal surfaces.",
    example: {
      position: [0, 0, 0],
      rotation: [-1.5708, 0, 0],
      scale: [10, 10, 1],
      material: { color: "#888888" },
      receiveShadow: true,
    },
  },

  Capsule: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      radius: z.number().nullable(),
      length: z.number().nullable(),
      capSegments: z.number().nullable(),
      radialSegments: z.number().nullable(),
    }),
    description: "Capsule mesh (cylinder with hemispherical caps).",
    example: {
      position: [0, 1, 0],
      material: { color: "#00cccc" },
    },
  },

  // ===========================================================================
  // Lights
  // ===========================================================================

  AmbientLight: {
    props: z.object({
      color: z.string().nullable(),
      intensity: z.number().nullable(),
    }),
    description:
      "Ambient light that illuminates all objects equally. No position needed.",
    example: { color: "#ffffff", intensity: 0.5 },
  },

  DirectionalLight: {
    props: z.object({
      ...transformProps,
      color: z.string().nullable(),
      intensity: z.number().nullable(),
      castShadow: z.boolean().nullable(),
    }),
    description:
      "Directional light (like sunlight). Position determines the direction it shines from.",
    example: {
      position: [5, 10, 5],
      intensity: 1,
      castShadow: true,
    },
  },

  PointLight: {
    props: z.object({
      ...transformProps,
      color: z.string().nullable(),
      intensity: z.number().nullable(),
      distance: z.number().nullable(),
      decay: z.number().nullable(),
      castShadow: z.boolean().nullable(),
    }),
    description: "Point light that radiates in all directions from a position.",
    example: {
      position: [0, 3, 0],
      intensity: 1,
      distance: 10,
    },
  },

  SpotLight: {
    props: z.object({
      ...transformProps,
      color: z.string().nullable(),
      intensity: z.number().nullable(),
      distance: z.number().nullable(),
      decay: z.number().nullable(),
      angle: z.number().nullable(),
      penumbra: z.number().nullable(),
      castShadow: z.boolean().nullable(),
    }),
    description:
      "Spot light emitting a cone of light. Angle in radians (default ~Math.PI/3).",
    example: {
      position: [0, 5, 0],
      intensity: 1,
      angle: 0.5,
      penumbra: 0.5,
      castShadow: true,
    },
  },

  // ===========================================================================
  // Container
  // ===========================================================================

  Group: {
    props: z.object({
      ...transformProps,
    }),
    slots: ["default"],
    description:
      "Container for grouping child objects. Transforms apply to all children.",
    example: { position: [0, 0, 0] },
  },

  // ===========================================================================
  // Model
  // ===========================================================================

  Model: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      url: z.string(),
    }),
    description:
      "GLTF/GLB 3D model loader. Provide a URL to a .glb or .gltf file.",
    example: {
      url: "/models/robot.glb",
      position: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },

  // ===========================================================================
  // Environment
  // ===========================================================================

  Environment: {
    props: z.object({
      preset: z
        .enum([
          "apartment",
          "city",
          "dawn",
          "forest",
          "lobby",
          "night",
          "park",
          "studio",
          "sunset",
          "warehouse",
        ])
        .nullable(),
      background: z.boolean().nullable(),
      blur: z.number().nullable(),
      intensity: z.number().nullable(),
    }),
    description:
      "HDRI environment map for lighting and background. Choose a preset or provide a custom HDRI.",
    example: { preset: "sunset", background: true },
  },

  Fog: {
    props: z.object({
      color: z.string().nullable(),
      near: z.number().nullable(),
      far: z.number().nullable(),
    }),
    description:
      "Linear fog effect. Objects fade between near and far distances.",
    example: { color: "#cccccc", near: 10, far: 50 },
  },

  GridHelper: {
    props: z.object({
      ...transformProps,
      size: z.number().nullable(),
      divisions: z.number().nullable(),
      color: z.string().nullable(),
      secondaryColor: z.string().nullable(),
    }),
    description: "Visual grid for reference. Renders on the XZ plane.",
    example: { size: 10, divisions: 10 },
  },

  // ===========================================================================
  // Text
  // ===========================================================================

  Text3D: {
    props: z.object({
      ...transformProps,
      text: z.string(),
      fontSize: z.number().nullable(),
      color: z.string().nullable(),
      anchorX: z.enum(["left", "center", "right"]).nullable(),
      anchorY: z
        .enum(["top", "top-baseline", "middle", "bottom-baseline", "bottom"])
        .nullable(),
      maxWidth: z.number().nullable(),
    }),
    description:
      "3D text rendered in the scene. Uses SDF text for crisp rendering at any size.",
    example: {
      text: "Hello World",
      fontSize: 1,
      color: "#ffffff",
      position: [0, 2, 0],
    },
  },

  // ===========================================================================
  // Effects / Atmosphere
  // ===========================================================================

  Sparkles: {
    props: z.object({
      ...transformProps,
      count: z.number().nullable(),
      speed: z.number().nullable(),
      opacity: z.number().nullable(),
      color: z.string().nullable(),
      size: z.number().nullable(),
      noise: z.number().nullable(),
    }),
    description:
      "Floating particle sparkles. Great for magic, snow, or ambient effects.",
    example: {
      count: 100,
      speed: 0.5,
      size: 2,
      color: "#ffffff",
      scale: [5, 5, 5],
    },
  },

  Stars: {
    props: z.object({
      radius: z.number().nullable(),
      depth: z.number().nullable(),
      count: z.number().nullable(),
      factor: z.number().nullable(),
      saturation: z.number().nullable(),
      fade: z.boolean().nullable(),
      speed: z.number().nullable(),
    }),
    description:
      "Starfield background. Renders thousands of stars in a sphere around the scene.",
    example: { radius: 100, depth: 50, count: 5000, factor: 4, fade: true },
  },

  Sky: {
    props: z.object({
      distance: z.number().nullable(),
      sunPosition: vector3Schema.nullable(),
      inclination: z.number().nullable(),
      azimuth: z.number().nullable(),
      mieCoefficient: z.number().nullable(),
      mieDirectionalG: z.number().nullable(),
      rayleigh: z.number().nullable(),
      turbidity: z.number().nullable(),
    }),
    description:
      "Procedural sky with sun. Control sun position, haze, and scattering.",
    example: { sunPosition: [100, 20, 100], turbidity: 8, rayleigh: 2 },
  },

  Cloud: {
    props: z.object({
      ...transformProps,
      seed: z.number().nullable(),
      segments: z.number().nullable(),
      bounds: vector3Schema.nullable(),
      volume: z.number().nullable(),
      speed: z.number().nullable(),
      fade: z.number().nullable(),
      opacity: z.number().nullable(),
      color: z.string().nullable(),
      growth: z.number().nullable(),
    }),
    description:
      "Volumetric cloud. Use multiple for a cloudscape. Wrap in a Clouds parent for batching.",
    example: {
      position: [0, 5, 0],
      speed: 0.2,
      opacity: 0.6,
      color: "#ffffff",
    },
  },

  // ===========================================================================
  // Special Materials (geometry + material combos)
  // ===========================================================================

  GlassSphere: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      radius: z.number().nullable(),
      widthSegments: z.number().nullable(),
      heightSegments: z.number().nullable(),
      color: z.string().nullable(),
      transmission: z.number().nullable(),
      thickness: z.number().nullable(),
      roughness: z.number().nullable(),
      chromaticAberration: z.number().nullable(),
      ior: z.number().nullable(),
      distortion: z.number().nullable(),
      distortionScale: z.number().nullable(),
      temporalDistortion: z.number().nullable(),
      samples: z.number().nullable(),
      resolution: z.number().nullable(),
    }),
    description:
      "Glass sphere with transmission/refraction. Creates photorealistic glass effect.",
    example: {
      position: [0, 1, 0],
      radius: 1,
      transmission: 1,
      thickness: 0.5,
      roughness: 0,
      chromaticAberration: 0.06,
    },
  },

  GlassBox: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      width: z.number().nullable(),
      height: z.number().nullable(),
      depth: z.number().nullable(),
      color: z.string().nullable(),
      transmission: z.number().nullable(),
      thickness: z.number().nullable(),
      roughness: z.number().nullable(),
      chromaticAberration: z.number().nullable(),
      ior: z.number().nullable(),
      distortion: z.number().nullable(),
      distortionScale: z.number().nullable(),
      temporalDistortion: z.number().nullable(),
      samples: z.number().nullable(),
      resolution: z.number().nullable(),
    }),
    description:
      "Glass box with transmission/refraction. Photorealistic glass cuboid.",
    example: {
      position: [0, 0.5, 0],
      width: 1,
      height: 1,
      depth: 1,
      transmission: 1,
      thickness: 0.5,
    },
  },

  DistortSphere: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      radius: z.number().nullable(),
      widthSegments: z.number().nullable(),
      heightSegments: z.number().nullable(),
      color: z.string().nullable(),
      speed: z.number().nullable(),
      distort: z.number().nullable(),
      metalness: z.number().nullable(),
      roughness: z.number().nullable(),
    }),
    description:
      "Animated distorting sphere. Organic, blobby look -- like liquid metal.",
    example: {
      position: [0, 1, 0],
      radius: 1,
      color: "#ff6600",
      speed: 2,
      distort: 0.5,
    },
  },

  // ===========================================================================
  // Extended Geometry
  // ===========================================================================

  TorusKnot: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      radius: z.number().nullable(),
      tube: z.number().nullable(),
      tubularSegments: z.number().nullable(),
      radialSegments: z.number().nullable(),
      p: z.number().nullable(),
      q: z.number().nullable(),
    }),
    description:
      "Torus knot mesh. A continuous 3D curve that creates intricate knot shapes via p and q parameters.",
    example: {
      position: [0, 1, 0],
      radius: 1,
      tube: 0.3,
      p: 2,
      q: 3,
      material: { color: "#ff44ff", metalness: 0.8, roughness: 0.2 },
    },
  },

  RoundedBox: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      material: materialSchema.nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      depth: z.number().nullable(),
      radius: z.number().nullable(),
      smoothness: z.number().nullable(),
    }),
    description:
      "Box with rounded edges. More polished look than a plain box. Great for product-style scenes.",
    example: {
      position: [0, 0.5, 0],
      width: 1,
      height: 1,
      depth: 1,
      radius: 0.1,
      material: { color: "#4488ff" },
    },
  },

  // ===========================================================================
  // Shadows / Staging
  // ===========================================================================

  ContactShadows: {
    props: z.object({
      ...transformProps,
      opacity: z.number().nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      blur: z.number().nullable(),
      near: z.number().nullable(),
      far: z.number().nullable(),
      smooth: z.boolean().nullable(),
      resolution: z.number().nullable(),
      frames: z.number().nullable(),
      color: z.string().nullable(),
    }),
    description:
      "Soft contact shadows projected onto the ground plane. Place at y=0 under objects.",
    example: {
      position: [0, 0, 0],
      opacity: 0.5,
      blur: 2,
      width: 10,
      height: 10,
    },
  },

  Float: {
    props: z.object({
      ...transformProps,
      speed: z.number().nullable(),
      rotationIntensity: z.number().nullable(),
      floatIntensity: z.number().nullable(),
      enabled: z.boolean().nullable(),
    }),
    slots: ["default"],
    description:
      "Wrapper that makes children gently float and bob. Adds organic motion to any object.",
    example: { speed: 1.5, rotationIntensity: 1, floatIntensity: 1 },
  },

  ReflectorPlane: {
    props: z.object({
      ...transformProps,
      width: z.number().nullable(),
      height: z.number().nullable(),
      color: z.string().nullable(),
      resolution: z.number().nullable(),
      blur: z.number().nullable(),
      mirror: z.number().nullable(),
      mixBlur: z.number().nullable(),
      mixStrength: z.number().nullable(),
      depthScale: z.number().nullable(),
      metalness: z.number().nullable(),
      roughness: z.number().nullable(),
    }),
    description:
      "Reflective floor/surface. Real-time mirror reflections on a plane. Rotate [-PI/2,0,0] for ground.",
    example: {
      position: [0, 0, 0],
      rotation: [-1.5708, 0, 0],
      width: 20,
      height: 20,
      mirror: 0.5,
      blur: [300, 100],
      resolution: 1024,
    },
  },

  Backdrop: {
    props: z.object({
      ...transformProps,
      floor: z.number().nullable(),
      segments: z.number().nullable(),
      receiveShadow: z.boolean().nullable(),
    }),
    slots: ["default"],
    description:
      "Curved studio backdrop for product-style scenes. Set floor for how much bends.",
    example: { floor: 0.25, segments: 20, receiveShadow: true },
  },

  // ===========================================================================
  // Crazy / Magic
  // ===========================================================================

  MeshPortalMaterial: {
    props: z.object({
      blend: z.number().nullable(),
      blur: z.number().nullable(),
      resolution: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Renders children into a portal surface (like a window to another world). Use as a child of a Mesh.",
    example: { blend: 0 },
  },

  HtmlLabel: {
    props: z.object({
      ...transformProps,
      text: z.string(),
      transform: z.boolean().nullable(),
      distanceFactor: z.number().nullable(),
      color: z.string().nullable(),
      fontSize: z.number().nullable(),
      center: z.boolean().nullable(),
    }),
    description: "Renders actual HTML/DOM text floating in the 3D scene.",
    example: { text: "Hello World", transform: true, distanceFactor: 10 },
  },

  // ===========================================================================
  // Post-Processing
  // ===========================================================================

  EffectComposer: {
    props: z.object({
      enabled: z.boolean().nullable(),
      multisampling: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Wrapper for post-processing effects. Add effects as children.",
    example: { multisampling: 8 },
  },

  Bloom: {
    props: z.object({
      intensity: z.number().nullable(),
      luminanceThreshold: z.number().nullable(),
      luminanceSmoothing: z.number().nullable(),
      mipmapBlur: z.boolean().nullable(),
    }),
    description: "Bloom post-processing effect. Makes emissive materials glow.",
    example: { intensity: 1.5, luminanceThreshold: 0.1, mipmapBlur: true },
  },

  Glitch: {
    props: z.object({
      delay: z.tuple([z.number(), z.number()]).nullable(),
      duration: z.tuple([z.number(), z.number()]).nullable(),
      strength: z.tuple([z.number(), z.number()]).nullable(),
      active: z.boolean().nullable(),
      ratio: z.number().nullable(),
    }),
    description: "Cyberpunk glitch post-processing effect.",
    example: { active: true },
  },

  Vignette: {
    props: z.object({
      offset: z.number().nullable(),
      darkness: z.number().nullable(),
    }),
    description: "Vignette post-processing effect (darkened corners).",
    example: { offset: 0.5, darkness: 0.5 },
  },

  // ===========================================================================
  // Animation Wrappers
  // ===========================================================================

  WarpTunnel: {
    props: z.object({
      ...transformProps,
      ringCount: z.number().nullable(),
      radius: z.number().nullable(),
      length: z.number().nullable(),
      speed: z.number().nullable(),
      tubeRadius: z.number().nullable(),
      color1: z.string().nullable(),
      color2: z.string().nullable(),
    }),
    description:
      "Animated neon tunnel flythrough. Rings rush toward the camera creating a hyperspace warp effect.",
    example: {
      speed: 8,
      ringCount: 80,
      radius: 3,
      color1: "#00ffff",
      color2: "#ff00ff",
    },
  },

  Spin: {
    props: z.object({
      ...transformProps,
      speed: z.number().nullable(),
      axis: z.enum(["x", "y", "z"]).nullable(),
    }),
    slots: ["default"],
    description:
      "Wrapper that continuously spins children around an axis. Speed in radians/second.",
    example: { speed: 1, axis: "y" },
  },

  Orbit: {
    props: z.object({
      ...transformProps,
      speed: z.number().nullable(),
      radius: z.number().nullable(),
      tilt: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Wrapper that orbits children around the Y axis at a given radius and speed.",
    example: { speed: 1, radius: 3, tilt: 0.5 },
  },

  Pulse: {
    props: z.object({
      ...transformProps,
      speed: z.number().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Wrapper that pulses children's scale between min and max values.",
    example: { speed: 1, min: 0.8, max: 1.2 },
  },

  CameraShake: {
    props: z.object({
      intensity: z.number().nullable(),
      maxYaw: z.number().nullable(),
      maxPitch: z.number().nullable(),
      maxRoll: z.number().nullable(),
    }),
    description:
      "Adds camera shake/vibration. Great for speed, impact, or unease effects.",
    example: { intensity: 0.5, maxYaw: 0.1, maxPitch: 0.1, maxRoll: 0.1 },
  },

  // ===========================================================================
  // Camera / Controls
  // ===========================================================================

  PerspectiveCamera: {
    props: z.object({
      ...transformProps,
      fov: z.number().nullable(),
      near: z.number().nullable(),
      far: z.number().nullable(),
      makeDefault: z.boolean().nullable(),
    }),
    description:
      "Perspective camera. Set makeDefault to use as the scene's main camera.",
    example: {
      position: [5, 5, 5],
      fov: 50,
      makeDefault: true,
    },
  },

  OrbitControls: {
    props: z.object({
      enableDamping: z.boolean().nullable(),
      dampingFactor: z.number().nullable(),
      enableZoom: z.boolean().nullable(),
      enablePan: z.boolean().nullable(),
      enableRotate: z.boolean().nullable(),
      minDistance: z.number().nullable(),
      maxDistance: z.number().nullable(),
      minPolarAngle: z.number().nullable(),
      maxPolarAngle: z.number().nullable(),
      autoRotate: z.boolean().nullable(),
      autoRotateSpeed: z.number().nullable(),
      target: z.tuple([z.number(), z.number(), z.number()]).nullable(),
    }),
    description:
      "Orbit camera controls. Allows the user to rotate, zoom, and pan around the scene.",
    example: { enableDamping: true, autoRotate: false },
  },
};

// =============================================================================
// Types
// =============================================================================

export type ComponentDefinition = {
  props: z.ZodType;
  slots?: string[];
  description: string;
  example?: Record<string, unknown>;
};

/**
 * Infer the props type for a Three component by name.
 *
 * @example
 * ```ts
 * type BoxProps = ThreeProps<"Box">;
 * ```
 */
export type ThreeProps<K extends keyof typeof threeComponentDefinitions> =
  z.output<(typeof threeComponentDefinitions)[K]["props"]>;

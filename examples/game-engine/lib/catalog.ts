import { z } from "zod";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { threeComponentDefinitions } from "@json-render/react-three-fiber/catalog";

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

const materialSchema = z.object({
  color: z.string().nullable(),
  metalness: z.number().nullable(),
  roughness: z.number().nullable(),
  emissive: z.string().nullable(),
  emissiveIntensity: z.number().nullable(),
  opacity: z.number().nullable(),
  transparent: z.boolean().nullable(),
  wireframe: z.boolean().nullable(),
});

const transformProps = {
  position: vector3Schema.nullable(),
  rotation: vector3Schema.nullable(),
  scale: vector3Schema.nullable(),
} as const;

const shadowProps = {
  castShadow: z.boolean().nullable(),
  receiveShadow: z.boolean().nullable(),
} as const;

const physicsSchema = z.object({
  mass: z.number().nullable(),
  isStatic: z.boolean().nullable(),
  restitution: z.number().nullable(),
  friction: z.number().nullable(),
  colliderType: z.enum(["cuboid", "ball", "capsule", "none"]).nullable(),
});

const damageSchema = z.object({
  amount: z.number().nullable(),
  enabled: z.boolean().nullable(),
});

const gameTransformShadowPhysicsDamage = {
  ...transformProps,
  ...shadowProps,
  material: materialSchema.nullable(),
  physics: physicsSchema.nullable(),
  damage: damageSchema.nullable(),
  objectId: z.string().nullable(),
};

export const gameComponentDefinitions = {
  // Keep all non-primitive R3F components as-is
  AmbientLight: threeComponentDefinitions.AmbientLight,
  DirectionalLight: threeComponentDefinitions.DirectionalLight,
  PointLight: threeComponentDefinitions.PointLight,
  SpotLight: threeComponentDefinitions.SpotLight,
  Group: threeComponentDefinitions.Group,
  Model: threeComponentDefinitions.Model,
  Environment: threeComponentDefinitions.Environment,
  Fog: threeComponentDefinitions.Fog,
  GridHelper: threeComponentDefinitions.GridHelper,
  Text3D: threeComponentDefinitions.Text3D,
  Sparkles: threeComponentDefinitions.Sparkles,
  Stars: threeComponentDefinitions.Stars,
  Sky: threeComponentDefinitions.Sky,
  Cloud: threeComponentDefinitions.Cloud,
  ContactShadows: threeComponentDefinitions.ContactShadows,
  Float: threeComponentDefinitions.Float,
  EffectComposer: threeComponentDefinitions.EffectComposer,
  Bloom: threeComponentDefinitions.Bloom,
  Vignette: threeComponentDefinitions.Vignette,
  PerspectiveCamera: threeComponentDefinitions.PerspectiveCamera,
  OrbitControls: threeComponentDefinitions.OrbitControls,

  // Game-specific primitives with physics & damage
  GameBox: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      width: z.number().nullable(),
      height: z.number().nullable(),
      depth: z.number().nullable(),
    }),
    description:
      "Box with optional physics and damage. ALWAYS set width, height, depth to create varied shapes — wide flat platforms (4, 0.2, 4), tall walls (0.3, 3, 5), long beams (6, 0.3, 0.3). Avoid 1x1x1 cubes.",
    example: {
      position: [0, 1.5, 0],
      width: 2,
      height: 3,
      depth: 0.3,
      material: { color: "#4488ff" },
      physics: { mass: 1, isStatic: true, colliderType: "cuboid" },
    },
  },

  GameSphere: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
      widthSegments: z.number().nullable(),
      heightSegments: z.number().nullable(),
    }),
    description:
      "Sphere with optional physics and damage. Set radius explicitly (0.2 for small details, 1-3 for tree canopies, 0.5 for default).",
    example: {
      position: [0, 1.5, 0],
      radius: 1.5,
      material: { color: "#228B22" },
      castShadow: true,
    },
  },

  GameCylinder: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radiusTop: z.number().nullable(),
      radiusBottom: z.number().nullable(),
      height: z.number().nullable(),
      radialSegments: z.number().nullable(),
    }),
    description:
      "Cylinder with optional physics and damage. Set radiusTop/radiusBottom to control thickness and height for tall/thin shapes (e.g. tree trunk: radiusTop 0.15, radiusBottom 0.2, height 4).",
    example: {
      position: [0, 2, 0],
      radiusTop: 0.15,
      radiusBottom: 0.2,
      height: 4,
      material: { color: "#8B4513" },
      castShadow: true,
    },
  },

  GameCone: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
      height: z.number().nullable(),
      radialSegments: z.number().nullable(),
    }),
    description:
      "Cone with optional physics and damage. Set radius and height for varied shapes (e.g. roof: radius 2.5, height 1.5).",
    example: {
      position: [0, 3.5, 0],
      radius: 2.5,
      height: 1.5,
      material: { color: "#8B0000" },
      castShadow: true,
    },
  },

  GameTorus: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
      tube: z.number().nullable(),
      radialSegments: z.number().nullable(),
      tubularSegments: z.number().nullable(),
    }),
    description:
      "Torus (ring) with optional physics and damage. Set radius and tube to control ring size and thickness.",
    example: {
      position: [0, 1, 0],
      radius: 1,
      tube: 0.15,
      material: { color: "#ff44ff" },
    },
  },

  GamePlane: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      width: z.number().nullable(),
      height: z.number().nullable(),
    }),
    description:
      "Plane with optional physics. Use for floors and walls. Rotate [-PI/2, 0, 0] for ground.",
    example: {
      position: [0, 0, 0],
      rotation: [-1.5708, 0, 0],
      scale: [10, 10, 1],
      material: { color: "#888888" },
      physics: { isStatic: true, colliderType: "cuboid" },
    },
  },

  GameCapsule: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
      length: z.number().nullable(),
      capSegments: z.number().nullable(),
      radialSegments: z.number().nullable(),
    }),
    description: "Capsule with optional physics and damage.",
    example: {
      position: [0, 1, 0],
      material: { color: "#00cccc" },
      physics: { mass: 1, colliderType: "capsule" },
    },
  },

  GameKnot: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
      tube: z.number().nullable(),
      tubularSegments: z.number().nullable(),
      radialSegments: z.number().nullable(),
      p: z.number().nullable(),
      q: z.number().nullable(),
    }),
    description: "Torus knot with optional physics and damage.",
    example: {
      position: [0, 1, 0],
      radius: 1,
      tube: 0.3,
      material: { color: "#ff44ff" },
    },
  },

  GameTetrahedron: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
    }),
    description: "Tetrahedron with optional physics and damage.",
  },

  GameOctahedron: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
    }),
    description: "Octahedron with optional physics and damage.",
  },

  GameDodecahedron: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
    }),
    description: "Dodecahedron with optional physics and damage.",
  },

  GameIcosahedron: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
    }),
    description: "Icosahedron with optional physics and damage.",
  },

  GameExtrude: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      shapeData: z
        .object({
          points: z.array(z.tuple([z.number(), z.number()])),
          holes: z.array(z.array(z.tuple([z.number(), z.number()]))).nullable(),
        })
        .nullable(),
      depth: z.number().nullable(),
    }),
    description: "Extruded 2D shape into 3D with optional physics and damage.",
    example: {
      position: [0, 0.5, 0],
      shapeData: {
        points: [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0.5, 0.5],
          [-0.5, 0.5],
        ],
      },
      depth: 1,
      material: { color: "#ff8800" },
    },
  },

  GameTube: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      radius: z.number().nullable(),
      tubularSegments: z.number().nullable(),
      radialSegments: z.number().nullable(),
    }),
    description: "Tube geometry following a curve with optional physics.",
    example: {
      position: [0, 0.5, 0],
      radius: 0.1,
      material: { color: "#00ccff" },
    },
  },

  GameShape: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      shapeData: z
        .object({
          points: z.array(z.tuple([z.number(), z.number()])),
          holes: z.array(z.array(z.tuple([z.number(), z.number()]))).nullable(),
        })
        .nullable(),
    }),
    description:
      "2D shape geometry (flat polygon) with optional physics and damage.",
    example: {
      position: [0, 0.5, 0],
      shapeData: {
        points: [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0, 0.5],
        ],
      },
      material: { color: "#ff00ff" },
    },
  },

  GameMesh: {
    props: z.object({
      ...gameTransformShadowPhysicsDamage,
      meshData: z
        .object({
          vertices: z.array(z.number()),
          indices: z.array(z.number()),
          normals: z.array(z.number()).nullable(),
          uvs: z.array(z.number()).nullable(),
        })
        .nullable(),
    }),
    description:
      "Custom mesh with raw vertex data. Specify vertices, indices, normals, and UVs.",
    example: {
      position: [0, 0.5, 0],
      meshData: {
        vertices: [-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0],
        indices: [0, 1, 2],
      },
      material: { color: "#88ff00" },
    },
  },

  // Unified light component
  GameLight: {
    props: z.object({
      ...transformProps,
      lightType: z.enum(["ambient", "directional", "point", "spot"]),
      color: z.string().nullable(),
      intensity: z.number().nullable(),
      distance: z.number().nullable(),
      decay: z.number().nullable(),
      angle: z.number().nullable(),
      penumbra: z.number().nullable(),
      castShadow: z.boolean().nullable(),
      objectId: z.string().nullable(),
    }),
    description:
      "Unified light component. Set lightType to ambient, directional, point, or spot.",
    example: {
      lightType: "directional",
      position: [5, 10, 5],
      intensity: 1,
      castShadow: true,
    },
  },

  // Player controller
  Player: {
    props: z.object({
      ...transformProps,
      objectId: z.string().nullable(),
      isPlayer: z.boolean().nullable(),
    }),
    description:
      "Player spawn point. Enables first/third-person controls when playing.",
    example: {
      position: [0, 0, 0],
    },
  },

  // Character NPC
  GameCharacter: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      modelUrl: z.string(),
      role: z.string().nullable(),
      physics: physicsSchema.nullable(),
      objectId: z.string().nullable(),
    }),
    description:
      "NPC character with GLTF model, proximity interaction, and AI dialogue.",
    example: {
      position: [3, 0, 0],
      modelUrl: "/models/character.glb",
      role: "village guard",
    },
  },

  // Game model with physics
  GameModel: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      url: z.string(),
      physics: physicsSchema.nullable(),
      damage: damageSchema.nullable(),
      objectId: z.string().nullable(),
    }),
    description: "GLTF/GLB 3D model with optional physics and damage.",
    example: {
      url: "/models/crate.glb",
      position: [0, 0, 0],
      physics: { isStatic: true, colliderType: "cuboid" },
    },
  },

  // Sound emitter
  SoundEmitter: {
    props: z.object({
      ...transformProps,
      url: z.string(),
      loop: z.boolean().nullable(),
      volume: z.number().nullable(),
      positional: z.boolean().nullable(),
      distance: z.number().nullable(),
      objectId: z.string().nullable(),
    }),
    description: "Positional or global audio emitter.",
    example: {
      position: [0, 1, 0],
      url: "/sounds/ambient.mp3",
      loop: true,
      positional: true,
    },
  },

  // Media plane
  MediaPlane: {
    props: z.object({
      ...transformProps,
      ...shadowProps,
      url: z.string(),
      mediaType: z.enum(["image", "video"]),
      loop: z.boolean().nullable(),
      autoplay: z.boolean().nullable(),
      muted: z.boolean().nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      objectId: z.string().nullable(),
    }),
    description: "Image or video displayed on a 3D plane.",
    example: {
      position: [0, 2, -3],
      url: "/images/poster.jpg",
      mediaType: "image",
      width: 3,
      height: 2,
    },
  },

  // Ground plane (physics-enabled floor)
  GroundPlane: {
    props: z.object({
      ...transformProps,
      material: materialSchema.nullable(),
      size: z.number().nullable(),
    }),
    description: "Physics-enabled ground plane.",
    example: {
      position: [0, -0.1, 0],
      size: 5000,
      material: { color: "#4CAF50" },
    },
  },
};

export type GameComponentDefinitions = typeof gameComponentDefinitions;

export const catalog = defineCatalog(schema, {
  components: gameComponentDefinitions,
  actions: {},
});

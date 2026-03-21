import { v4 as uuidv4 } from "uuid";
import type {
  SceneObject,
  Scene,
  SceneSettings,
  EnvironmentSettings,
  ObjectType,
} from "./types";

export function createDefaultGrass(): SceneObject {
  return {
    id: uuidv4(),
    name: "Grass",
    description: "Large grass plane",
    type: "plane",
    position: [0, -0.1, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [5000, 5000, 1],
    material: {
      color: "#4CAF50",
      metalness: 0.0,
      roughness: 0.9,
      emissive: "#000000",
      emissiveIntensity: 0,
    },
    physics: {
      mass: 0,
      isStatic: true,
      restitution: 0.2,
      friction: 0.8,
      colliderType: "cuboid",
    },
    visible: true,
  };
}

export function createDefaultAmbientLight(): SceneObject {
  return {
    id: uuidv4(),
    name: "Ambient Light",
    description: "Default ambient light",
    type: "light",
    position: [0, 3, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      color: "#ffffff",
      metalness: 0,
      roughness: 1,
      emissive: "#000000",
      emissiveIntensity: 0,
    },
    physics: {
      mass: 1,
      isStatic: false,
      restitution: 0.2,
      friction: 0.5,
      colliderType: "none",
    },
    visible: true,
    intensity: 0.5,
    lightType: "ambient",
  };
}

export function createDefaultDirectionalLight(): SceneObject {
  return {
    id: uuidv4(),
    name: "Directional Light",
    description: "Default directional light",
    type: "light",
    position: [10, 10, 10],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      color: "#ffffff",
      metalness: 0,
      roughness: 1,
      emissive: "#000000",
      emissiveIntensity: 0,
    },
    physics: {
      mass: 1,
      isStatic: false,
      restitution: 0.2,
      friction: 0.5,
      colliderType: "none",
    },
    visible: true,
    intensity: 1,
    lightType: "directional",
  };
}

export function createDefaultPlayer(): SceneObject {
  return {
    id: "player-" + uuidv4(),
    name: "Player",
    description: "Default player",
    type: "player",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      color: "#3498db",
      metalness: 0.1,
      roughness: 0.5,
      emissive: "#000000",
      emissiveIntensity: 0,
    },
    physics: {
      mass: 1,
      isStatic: false,
      restitution: 0.2,
      friction: 0.5,
      colliderType: "none",
    },
    visible: true,
    isPlayer: true,
  };
}

export function createDefaultSceneSettings(): SceneSettings {
  return {
    grid: {
      visible: true,
      size: 1,
      divisions: 100,
      color: "#444444",
      secondaryColor: "#888888",
      fadeDistance: 100,
      fadeStrength: 1,
    },
    fog: {
      enabled: false,
      color: "#cccccc",
      near: 1,
      far: 50,
    },
  };
}

export function createDefaultEnvironmentSettings(): EnvironmentSettings {
  return {
    preset: "city",
    customHdri: null,
    intensity: 1,
    blur: 0.5,
  };
}

export function createDefaultScene(name = "Scene 1"): Scene {
  return {
    id: uuidv4(),
    name,
    description: "",
    isDefault: true,
    objects: [
      createDefaultGrass(),
      createDefaultAmbientLight(),
      createDefaultDirectionalLight(),
      createDefaultPlayer(),
    ],
    sceneSettings: createDefaultSceneSettings(),
    environmentSettings: createDefaultEnvironmentSettings(),
  };
}

export function createDefaultObject(
  type: ObjectType,
  id: string,
  objectCount: number,
): SceneObject {
  const obj: SceneObject = {
    id,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${objectCount + 1}`,
    description: "",
    type,
    position: [
      0,
      type === "box" ||
      type === "cylinder" ||
      type === "cone" ||
      type === "torus"
        ? 0.5
        : 0,
      0,
    ],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      color:
        type === "light"
          ? "#ffffff"
          : type === "player"
            ? "#3498db"
            : `#${Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, "0")}`,
      metalness: 0.1,
      roughness: 0.5,
      emissive: "#000000",
      emissiveIntensity: 0,
    },
    physics: {
      mass: 1,
      isStatic: false,
      restitution: 0.2,
      friction: 0.5,
      colliderType:
        type === "sphere" ? "ball" : type === "capsule" ? "capsule" : "cuboid",
    },
    damage: {
      amount: 0,
      enabled: false,
    },
    visible: true,
  };

  if (
    type === "capsule" ||
    type === "extrude" ||
    type === "tetrahedron" ||
    type === "octahedron" ||
    type === "dodecahedron" ||
    type === "icosahedron" ||
    type === "knot" ||
    type === "tube" ||
    type === "shape" ||
    type === "mesh"
  ) {
    obj.position = [0, 0.5, 0];
  }

  if (type === "light") {
    obj.intensity = 1;
    obj.distance = 0;
    obj.decay = 2;
    obj.lightType = "point";
    obj.physics.colliderType = "none";
  }

  if (type === "plane") {
    obj.rotation = [-Math.PI / 2, 0, 0];
  }

  if (type === "player") {
    obj.name = "Player";
    obj.position = [0, 0, 0];
    obj.physics.colliderType = "none";
    obj.isPlayer = true;
  }

  if (type === "image" || type === "video") {
    obj.physics.colliderType = "none";
    obj.physics.isStatic = true;
  }

  if (type === "shape") {
    obj.shapeData = {
      points: [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
      ],
      holes: [],
    };
  }

  if (type === "mesh") {
    obj.meshData = {
      vertices: [
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
        -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5,
        -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
        0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
      ],
      indices: [
        0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12,
        14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
      ],
    };
  }

  return obj;
}

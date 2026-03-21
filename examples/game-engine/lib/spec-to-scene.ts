import { v4 as uuidv4 } from "uuid";
import type { Spec } from "@json-render/core";
import type {
  SceneObject,
  ObjectType,
  LightType,
  Material,
  Physics,
  ColliderType,
} from "./types";

const specTypeToObjectType: Record<string, ObjectType> = {
  GameBox: "box",
  GameSphere: "sphere",
  GameCylinder: "cylinder",
  GameCone: "cone",
  GameTorus: "torus",
  GamePlane: "plane",
  GameCapsule: "capsule",
  GameKnot: "knot",
  GameTetrahedron: "tetrahedron",
  GameOctahedron: "octahedron",
  GameDodecahedron: "dodecahedron",
  GameIcosahedron: "icosahedron",
  GameExtrude: "extrude",
  GameTube: "tube",
  GameShape: "shape",
  GameMesh: "mesh",
  GameLight: "light",
  Player: "player",
  GameCharacter: "character",
  GameModel: "model",
  SoundEmitter: "sound",
  MediaPlane: "image",
  GroundPlane: "plane",
};

const DEFAULT_MATERIAL: Material = {
  color: "#888888",
  metalness: 0,
  roughness: 0.5,
  emissive: "#000000",
  emissiveIntensity: 0,
};

const DEFAULT_PHYSICS: Physics = {
  mass: 1,
  isStatic: false,
  restitution: 0.3,
  friction: 0.5,
  colliderType: "none",
};

function parseMaterial(raw: unknown): Material {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MATERIAL };
  const m = raw as Record<string, unknown>;
  return {
    color: (m.color as string) || DEFAULT_MATERIAL.color,
    metalness: (m.metalness as number) ?? DEFAULT_MATERIAL.metalness,
    roughness: (m.roughness as number) ?? DEFAULT_MATERIAL.roughness,
    emissive: (m.emissive as string) || DEFAULT_MATERIAL.emissive,
    emissiveIntensity:
      (m.emissiveIntensity as number) ?? DEFAULT_MATERIAL.emissiveIntensity,
  };
}

function parsePhysics(raw: unknown): Physics {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PHYSICS };
  const p = raw as Record<string, unknown>;
  return {
    mass: (p.mass as number) ?? DEFAULT_PHYSICS.mass,
    isStatic: (p.isStatic as boolean) ?? DEFAULT_PHYSICS.isStatic,
    restitution: (p.restitution as number) ?? DEFAULT_PHYSICS.restitution,
    friction: (p.friction as number) ?? DEFAULT_PHYSICS.friction,
    colliderType:
      (p.colliderType as ColliderType) || DEFAULT_PHYSICS.colliderType,
  };
}

function specElementToSceneObject(
  key: string,
  element: {
    type: string;
    props: Record<string, unknown>;
    children?: string[];
  },
): SceneObject | null {
  const objectType = specTypeToObjectType[element.type];
  if (!objectType) return null;

  const props = element.props;

  const id = (props.objectId as string) || key.replace(/^obj-/, "") || uuidv4();

  const obj: SceneObject = {
    id,
    name: (props.name as string) || element.type.replace(/^Game/, ""),
    type: objectType,
    position: (props.position as [number, number, number]) || [0, 0, 0],
    rotation: (props.rotation as [number, number, number]) || [0, 0, 0],
    scale: (props.scale as [number, number, number]) || [1, 1, 1],
    material: parseMaterial(props.material),
    physics: parsePhysics(props.physics),
    visible: true,
  };

  if (props.damage && typeof props.damage === "object") {
    const d = props.damage as Record<string, unknown>;
    obj.damage = {
      amount: (d.amount as number) ?? 0,
      enabled: (d.enabled as boolean) ?? false,
    };
  }

  if (element.type === "GameLight") {
    obj.lightType = (props.lightType as LightType) || "point";
    obj.intensity = (props.intensity as number) ?? 1;
    if (props.color) obj.material.color = props.color as string;
    if (props.distance != null) obj.distance = props.distance as number;
    if (props.decay != null) obj.decay = props.decay as number;
    if (props.angle != null) obj.angle = props.angle as number;
    if (props.penumbra != null) obj.penumbra = props.penumbra as number;
    obj.physics.colliderType = "none";
  }

  if (element.type === "Player") {
    obj.isPlayer = true;
    obj.physics.colliderType = "none";
  }

  if (element.type === "GameCharacter") {
    obj.modelUrl = (props.modelUrl as string) || "";
    obj.character = { role: (props.role as string) || "villager" };
  }

  if (element.type === "GameModel") {
    obj.modelUrl = (props.url as string) || "";
  }

  if (element.type === "SoundEmitter") {
    obj.sound = {
      url: (props.url as string) || "",
      loop: (props.loop as boolean) ?? false,
      volume: (props.volume as number) ?? 1,
      positional: (props.positional as boolean) ?? true,
      distance: (props.distance as number) ?? 10,
    };
    obj.physics.colliderType = "none";
  }

  if (element.type === "MediaPlane") {
    const mediaType = (props.mediaType as string) || "image";
    obj.type = mediaType === "video" ? "video" : "image";
    obj.media = {
      url: (props.url as string) || "",
      type: mediaType,
      loop: props.loop as boolean | undefined,
      autoplay: props.autoplay as boolean | undefined,
      muted: props.muted as boolean | undefined,
    };
    obj.physics.colliderType = "none";
  }

  // Geometry props
  if (props.width != null) obj.width = props.width as number;
  if (props.height != null) obj.height = props.height as number;
  if (props.depth != null) obj.depth = props.depth as number;
  if (props.radius != null) obj.radius = props.radius as number;
  if (props.radiusTop != null) obj.radiusTop = props.radiusTop as number;
  if (props.radiusBottom != null)
    obj.radiusBottom = props.radiusBottom as number;
  if (props.radialSegments != null)
    obj.radialSegments = props.radialSegments as number;
  if (props.tube != null) obj.tube = props.tube as number;
  if (props.tubularSegments != null)
    obj.tubularSegments = props.tubularSegments as number;
  if (props.widthSegments != null)
    obj.widthSegments = props.widthSegments as number;
  if (props.heightSegments != null)
    obj.heightSegments = props.heightSegments as number;
  if (props.length != null) obj.length = props.length as number;
  if (props.p != null) obj.p = props.p as number;
  if (props.q != null) obj.q = props.q as number;

  if (props.shapeData && typeof props.shapeData === "object") {
    obj.shapeData = props.shapeData as SceneObject["shapeData"];
  }

  if (props.meshData && typeof props.meshData === "object") {
    obj.meshData = props.meshData as SceneObject["meshData"];
  }

  if (element.type === "GroundPlane") {
    obj.material = parseMaterial(props.material);
    obj.rotation = [-Math.PI / 2, 0, 0];
    const size = (props.size as number) ?? 5000;
    obj.scale = [size, size, 1];
    obj.physics = {
      mass: 0,
      isStatic: true,
      restitution: 0.2,
      friction: 0.8,
      colliderType: "cuboid",
    };
  }

  return obj;
}

/**
 * Convert a json-render spec back into SceneObject[].
 * Extracts all elements whose keys start with "obj-".
 * Uses the scene root's children for ordering, then appends any
 * obj-* elements not yet in children (handles streaming where
 * elements arrive before the scene children array is updated).
 */
export function specToSceneObjects(spec: Spec): SceneObject[] {
  const sceneElement = spec.elements["scene"] || spec.elements[spec.root];
  const objects: SceneObject[] = [];
  const seen = new Set<string>();

  const childKeys = sceneElement?.children || [];
  for (const key of childKeys) {
    if (!key.startsWith("obj-")) continue;
    const element = spec.elements[key];
    if (!element) continue;
    seen.add(key);

    const obj = specElementToSceneObject(key, element);
    if (obj) objects.push(obj);
  }

  for (const key of Object.keys(spec.elements)) {
    if (!key.startsWith("obj-") || seen.has(key)) continue;
    const element = spec.elements[key];
    if (!element) continue;

    const obj = specElementToSceneObject(key, element);
    if (obj) objects.push(obj);
  }

  return objects;
}

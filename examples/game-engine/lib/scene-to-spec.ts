import type { Scene, SceneObject } from "./types";

interface SpecElement {
  type: string;
  props: Record<string, unknown>;
  children: string[];
}

interface Spec {
  root: string;
  elements: Record<string, SpecElement>;
}

const primitiveTypeMap: Record<string, string> = {
  box: "GameBox",
  sphere: "GameSphere",
  cylinder: "GameCylinder",
  cone: "GameCone",
  torus: "GameTorus",
  plane: "GamePlane",
  capsule: "GameCapsule",
  knot: "GameKnot",
  tetrahedron: "GameTetrahedron",
  octahedron: "GameOctahedron",
  dodecahedron: "GameDodecahedron",
  icosahedron: "GameIcosahedron",
  extrude: "GameExtrude",
  tube: "GameTube",
  shape: "GameShape",
  mesh: "GameMesh",
};

function objectToSpecType(obj: SceneObject): string {
  if (obj.type === "light") return "GameLight";
  if (obj.type === "player") return "Player";
  if (obj.type === "character") return "GameCharacter";
  if (obj.type === "model") return "GameModel";
  if (obj.type === "sound") return "SoundEmitter";
  if (obj.type === "image" || obj.type === "video") return "MediaPlane";
  return primitiveTypeMap[obj.type] || "GameBox";
}

function objectToProps(obj: SceneObject): Record<string, unknown> {
  const props: Record<string, unknown> = {
    position: obj.position,
    rotation: obj.rotation,
    scale: obj.scale,
    objectId: obj.id,
  };

  const specType = objectToSpecType(obj);

  if (specType === "GameLight") {
    props.lightType = obj.lightType || "point";
    props.color = obj.material.color;
    props.intensity = obj.intensity ?? 1;
    if (obj.distance) props.distance = obj.distance;
    if (obj.decay) props.decay = obj.decay;
    if (obj.angle) props.angle = obj.angle;
    if (obj.penumbra) props.penumbra = obj.penumbra;
    props.castShadow =
      obj.lightType === "directional" || obj.lightType === "spot";
    return props;
  }

  if (specType === "Player") {
    props.isPlayer = true;
    return props;
  }

  if (specType === "GameCharacter") {
    props.modelUrl = obj.modelUrl || "";
    props.role = obj.character?.role || "villager";
    if (obj.physics.colliderType !== "none") {
      props.physics = obj.physics;
    }
    props.castShadow = true;
    props.receiveShadow = true;
    return props;
  }

  if (specType === "GameModel") {
    props.url = obj.modelUrl || "";
    if (obj.physics.colliderType !== "none") {
      props.physics = obj.physics;
    }
    if (obj.damage?.enabled) {
      props.damage = obj.damage;
    }
    props.castShadow = true;
    props.receiveShadow = true;
    return props;
  }

  if (specType === "SoundEmitter") {
    props.url = obj.sound?.url || "";
    props.loop = obj.sound?.loop ?? false;
    props.volume = obj.sound?.volume ?? 1;
    props.positional = obj.sound?.positional ?? true;
    props.distance = obj.sound?.distance ?? 10;
    return props;
  }

  if (specType === "MediaPlane") {
    props.url = obj.media?.url || "";
    props.mediaType = obj.type === "video" ? "video" : "image";
    props.loop = obj.media?.loop;
    props.autoplay = obj.media?.autoplay;
    props.muted = obj.media?.muted;
    return props;
  }

  // Game primitives
  props.material = obj.material;
  if (obj.physics.colliderType !== "none") {
    props.physics = obj.physics;
  }
  if (obj.damage?.enabled) {
    props.damage = obj.damage;
  }
  if (obj.shapeData) {
    props.shapeData = obj.shapeData;
  }
  if (obj.meshData) {
    props.meshData = obj.meshData;
  }

  // Geometry props
  if (obj.width != null) props.width = obj.width;
  if (obj.height != null) props.height = obj.height;
  if (obj.depth != null) props.depth = obj.depth;
  if (obj.radius != null) props.radius = obj.radius;
  if (obj.radiusTop != null) props.radiusTop = obj.radiusTop;
  if (obj.radiusBottom != null) props.radiusBottom = obj.radiusBottom;
  if (obj.radialSegments != null) props.radialSegments = obj.radialSegments;
  if (obj.tube != null) props.tube = obj.tube;
  if (obj.tubularSegments != null) props.tubularSegments = obj.tubularSegments;
  if (obj.widthSegments != null) props.widthSegments = obj.widthSegments;
  if (obj.heightSegments != null) props.heightSegments = obj.heightSegments;
  if (obj.length != null) props.length = obj.length;
  if (obj.p != null) props.p = obj.p;
  if (obj.q != null) props.q = obj.q;

  props.castShadow = true;
  props.receiveShadow = true;

  return props;
}

export function sceneToSpec(scene: Scene): Spec {
  const elements: Record<string, SpecElement> = {};
  const childIds: string[] = [];

  // Add environment
  elements["env"] = {
    type: "Environment",
    props: {
      preset: scene.environmentSettings.preset,
      background: true,
      blur: scene.environmentSettings.blur,
      intensity: scene.environmentSettings.intensity,
    },
    children: [],
  };
  childIds.push("env");

  // Add fog if enabled
  if (scene.sceneSettings.fog.enabled) {
    elements["fog"] = {
      type: "Fog",
      props: {
        color: scene.sceneSettings.fog.color,
        near: scene.sceneSettings.fog.near,
        far: scene.sceneSettings.fog.far,
      },
      children: [],
    };
    childIds.push("fog");
  }

  // Add grid if visible
  if (scene.sceneSettings.grid.visible) {
    elements["grid"] = {
      type: "GridHelper",
      props: {
        position: [0, 0.01, 0],
        size:
          scene.sceneSettings.grid.size * scene.sceneSettings.grid.divisions,
        divisions: scene.sceneSettings.grid.divisions,
        color: scene.sceneSettings.grid.color,
        secondaryColor: scene.sceneSettings.grid.secondaryColor,
        fadeDistance: scene.sceneSettings.grid.fadeDistance,
        fadeStrength: scene.sceneSettings.grid.fadeStrength,
      },
      children: [],
    };
    childIds.push("grid");
  }

  // Add scene objects
  for (const obj of scene.objects) {
    if (!obj.visible) continue;

    const key = `obj-${obj.id}`;
    elements[key] = {
      type: objectToSpecType(obj),
      props: objectToProps(obj),
      children: [],
    };
    childIds.push(key);
  }

  // Root scene group
  elements["scene"] = {
    type: "Group",
    props: { position: null, rotation: null, scale: null },
    children: childIds,
  };

  return {
    root: "scene",
    elements,
  };
}

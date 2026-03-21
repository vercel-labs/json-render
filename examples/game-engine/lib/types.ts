export type ObjectType =
  | "box"
  | "sphere"
  | "cylinder"
  | "cone"
  | "torus"
  | "plane"
  | "capsule"
  | "tetrahedron"
  | "octahedron"
  | "dodecahedron"
  | "icosahedron"
  | "knot"
  | "tube"
  | "extrude"
  | "shape"
  | "mesh"
  | "light"
  | "model"
  | "character"
  | "sound"
  | "player"
  | "image"
  | "video";

export type TransformMode = "select" | "translate" | "rotate" | "scale";

export type ColliderType = "cuboid" | "ball" | "capsule" | "none";

export type LightType = "ambient" | "directional" | "point" | "spot";

export type ViewMode = "first-person" | "third-person";

export interface Material {
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
}

export interface Physics {
  mass: number;
  isStatic: boolean;
  restitution: number;
  friction: number;
  colliderType: ColliderType | "none";
}

export interface Character {
  role: string;
}

export interface Sound {
  url: string;
  loop: boolean;
  volume: number;
  positional: boolean;
  distance: number;
}

export interface Media {
  url: string;
  type: string;
  loop?: boolean;
  autoplay?: boolean;
  muted?: boolean;
}

export interface Damage {
  amount: number;
  enabled: boolean;
}

export interface ShapeData {
  points: [number, number][];
  holes: [number, number][][];
}

export interface MeshData {
  vertices: number[];
  indices: number[];
  normals?: number[];
  uvs?: number[];
}

export interface SceneSettings {
  grid: {
    visible: boolean;
    size: number;
    divisions: number;
    color: string;
    secondaryColor: string;
    fadeDistance: number;
    fadeStrength: number;
  };
  fog: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
  };
}

export interface EnvironmentSettings {
  preset: string;
  customHdri: string | null;
  intensity: number;
  blur: number;
}

export interface SceneObject {
  id: string;
  name: string;
  description?: string;
  type: ObjectType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  material: Material;
  physics: Physics;
  visible: boolean;
  intensity?: number;
  distance?: number;
  decay?: number;
  angle?: number;
  penumbra?: number;
  modelUrl?: string;
  character?: Character;
  sound?: Sound;
  media?: Media;
  damage?: Damage;
  lightType?: LightType;
  isPlayer?: boolean;
  shapeData?: ShapeData;
  meshData?: MeshData;

  // Geometry props (preserved through spec round-trip)
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  radialSegments?: number;
  tube?: number;
  tubularSegments?: number;
  widthSegments?: number;
  heightSegments?: number;
  length?: number;
  p?: number;
  q?: number;
}

export interface Scene {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  objects: SceneObject[];
  sceneSettings: SceneSettings;
  environmentSettings: EnvironmentSettings;
}

export interface HistoryState {
  past: Scene[][];
  future: Scene[][];
}

export interface EditorState {
  scenes: Scene[];
  activeSceneId: string;
  selectedObjectId: string | null;
  transformMode: TransformMode;
  isPlaying: boolean;
  isLoading: boolean;
  viewMode: ViewMode;
  isPromptOpen: boolean;

  health: number;
  shield: number;
  maxHealth: number;
  maxShield: number;
  lastDamageTime: number | null;
  damageCooldown: number;

  history: HistoryState;
  canUndo: boolean;
  canRedo: boolean;

  // Computed
  activeScene: Scene | undefined;
  activeSceneObjects: SceneObject[];

  // Scene actions
  createScene: (name?: string) => void;
  deleteScene: (id: string) => void;
  duplicateScene: (id: string) => void;
  setActiveScene: (id: string) => void;
  updateSceneName: (id: string, name: string) => void;
  updateSceneDescription: (id: string, description: string) => void;

  // Object actions
  addObject: (type: ObjectType) => void;
  createCustomObject: (
    type: ObjectType,
    properties: Partial<SceneObject>,
  ) => void;
  removeObject: (id: string) => void;
  replaceSceneObjects: (objects: SceneObject[]) => void;
  initializePlayer: () => void;

  // Updates
  selectObject: (id: string | null) => void;
  updateObjectTransform: (
    id: string,
    transform: Partial<Pick<SceneObject, "position" | "rotation" | "scale">>,
  ) => void;
  updateObjectMaterial: (id: string, material: Partial<Material>) => void;
  updateObjectPhysics: (id: string, physics: Partial<Physics>) => void;
  updateCharacter: (id: string, character: Partial<Character>) => void;
  updateSound: (id: string, sound: Partial<Sound>) => void;
  updateMedia: (id: string, media: Partial<Media>) => void;
  updateDamage: (id: string, damage: Partial<Damage>) => void;
  updateSceneSettings: (settings: Partial<SceneSettings>) => void;
  updateEnvironmentSettings: (settings: Partial<EnvironmentSettings>) => void;
  updateObjectGeneral: (id: string, updates: Partial<SceneObject>) => void;
  toggleObjectVisibility: (id: string) => void;

  // UI state
  setTransformMode: (mode: TransformMode) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsPromptOpen: (open: boolean) => void;

  // History
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Health
  setHealth: (health: number) => void;
  setShield: (shield: number) => void;
  takeDamage: (amount: number) => void;
}

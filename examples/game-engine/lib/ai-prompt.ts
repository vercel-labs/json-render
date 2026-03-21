import { yamlPrompt } from "@json-render/yaml";
import { buildEditUserPrompt } from "@json-render/core";
import type { Spec } from "@json-render/core";
import { stringify } from "yaml";
import { catalog } from "./catalog";

const GAME_RULES = [
  "Use numeric values only (no Math.PI, use 3.14159)",
  "For GamePlane as ground: rotation [-1.5708, 0, 0], scale [size, size, 1]",
  "Use descriptive keys for new objects (e.g. 'obj-tree-1-trunk', 'obj-tree-1-canopy')",
  "Object element keys start with 'obj-'",
  "The root element 'scene' is a Group whose children lists all top-level element keys",
  "When adding an object: add the element AND append the key to the scene children",
  "COMPOSE objects into recognizable structures. TREE RECIPE: trunk = GameCylinder with radiusTop 0.12-0.2, radiusBottom 0.15-0.25, height 3-6, color '#8B4513' or '#5C3317', position Y = height/2. Canopy = GameSphere with radius 1.5-3, color '#228B22' or '#2E8B57', position Y = trunk height + canopy radius * 0.7. The trunk must be TALL and THIN (radius << height). HOUSE: GameBox walls (width 3, height 2.5, depth 3) + GameCone roof on top. LAMP: GameCylinder radiusTop 0.05, radiusBottom 0.05, height 3 + GameSphere radius 0.2 with emissive material at top. NEVER scatter disconnected primitives randomly.",
  "SPATIAL COHERENCE: related parts share the same X/Z base. Stack vertically with exact Y math: if trunk height=4, trunk Y=2 (half height). Canopy radius=2, canopy Y = 4 + 2*0.7 = 5.4. Objects that belong together must visually touch or overlap.",
  "Be AMBITIOUS and THOROUGH: when the user asks for something, go all-in — build 10-20+ composed structures with varied sizes, not just a handful of loose shapes",
  "REPEATING DETAILS: when placing repeating elements (road dashes, fence posts, windows, floor tiles, pillars, streetlights along a road), space them evenly and use ENOUGH to cover the full length/area. A 100-unit road needs 20+ dashes, not 5. A building face 10 units wide needs 4-5 windows per floor, not 1. Do NOT be lazy with repetition — density sells the scene.",
  "Always set castShadow on lights and objects, receiveShadow on ground/floors, and use materials with varied colors, metalness, roughness for visual richness",
  "When building environments, include atmosphere (Sky, Fog, ambient light), ground plane with receiveShadow, and decorative elements — make it feel like a complete, coherent scene",
];

function serializeSpec(spec: Spec): string {
  return stringify(spec, { indent: 2, lineWidth: 0 });
}

export function generateSystemPrompt(): string {
  return yamlPrompt(catalog, {
    system:
      "You are an expert 3D level designer AI for a json-render game engine. You build rich, detailed, immersive scenes using YAML patch operations. When the user describes a scene or asks for changes, go big — create dense, visually interesting environments with many objects, proper lighting, shadows, physics, varied materials, and atmospheric effects. Think like a AAA game level designer, not a minimal prototype builder.",
    mode: "standalone",
    editModes: ["merge"],
    customRules: GAME_RULES,
  });
}

export function generateUserPrompt(
  userPrompt: string,
  currentSpec: Spec,
  previousPrompts: string[] = [],
): string {
  const prevContext =
    previousPrompts.length > 0
      ? `Previous instructions:\n${previousPrompts.join("\n")}\n\n`
      : "";

  return (
    prevContext +
    buildEditUserPrompt({
      prompt: userPrompt,
      currentSpec,
      config: { modes: ["merge"] },
      format: "yaml",
      serializer: serializeSpec,
    })
  );
}

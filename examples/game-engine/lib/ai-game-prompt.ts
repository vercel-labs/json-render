import type { SceneObject } from "./types";

export function generateGameAIPrompt(
  userPrompt: string,
  objects: SceneObject[] = [],
  previousPrompts: string[] = [],
): string {
  const simplifiedObjects = objects.map((obj) => ({
    id: obj.id,
    name: obj.name,
    type: obj.type,
    position: obj.position,
    rotation: obj.rotation,
    scale: obj.scale,
    material: obj.material,
    physics: obj.physics,
    lightType: obj.lightType,
    intensity: obj.intensity,
    damage: obj.damage,
    shapeData: obj.shapeData,
    meshData: obj.meshData,
  }));

  return `You are an AI assistant that helps users create and modify 3D scenes.
The user has given you this instruction: "${userPrompt}".

You have access to these functions:
- addObject(type): Creates a new object of type "box", "sphere", "cylinder", "cone", "torus", "plane", "light", "capsule", "extrude", "tetrahedron", "octahedron", "dodecahedron", "icosahedron", "knot", "tube", "shape", "mesh"
- createCustomObject(type, properties): Creates a new object with custom properties. Properties can include:
  * name: string
  * position: [x, y, z]
  * rotation: [x, y, z] (For plane objects, default rotation is [-1.5708, 0, 0])
  * scale: [x, y, z] (For plane objects, Z scale is always 1)
  * material: { color, metalness, roughness, emissive, emissiveIntensity }
  * physics: { mass, isStatic, restitution, friction, colliderType }
  * damage: { amount, enabled }
  * lightType: "ambient", "directional", "point", or "spot"
  * intensity: number
  * distance: number
  * decay: number
  * angle: number
  * penumbra: number
  * shapeData: { points: [x,y][], holes?: [x,y][][] }
  * meshData: { vertices: number[], indices: number[], normals?: number[], uvs?: number[] }
- updateObjectTransform(id, {position, rotation, scale}): Updates an object's transform
- updateObjectMaterial(id, {color, metalness, roughness, emissive, emissiveIntensity}): Updates material
- updateObjectPhysics(id, {mass, isStatic, restitution, friction, colliderType}): Updates physics
- updateDamage(id, {amount, enabled}): Updates damage properties
- selectObject(id): Selects an object
- setTransformMode(mode): Sets transform mode to "select", "translate", "rotate", or "scale"

Current objects in the scene:
${JSON.stringify(simplifiedObjects, null, 2)}

Previous user instructions:
${previousPrompts.map((p) => `- "${p}"`).join("\n")}

Respond with a series of JSON objects, one per line (JSONL format). Each JSON object should have a "function" property and "args" property.
Example:
{"function": "createCustomObject", "args": ["box", {"name": "Large Red Box", "position": [0, 1, 0], "scale": [2, 2, 2], "material": {"color": "#ff0000"}, "physics": {"mass": 5, "isStatic": false, "restitution": 0.5}}]}
{"function": "updateObjectTransform", "args": ["object-id", {"position": [0, -1, 0], "scale": [10, 1, 10]}]}

IMPORTANT CONSTRAINTS:
1. For plane objects, the Z scale must always be 1.
2. For plane objects, the default rotation is [-1.5708, 0, 0] to make them horizontal.
3. Only use the functions listed above.
4. Your response must be valid JSONL format with one JSON object per line. Do not include any explanations.
5. Do not wrap your response in an array. Each line should be a separate, complete JSON object.
6. Each JSON object MUST have exactly this format: {"function": "functionName", "args": [arg1, arg2, ...]}
7. Do not use JavaScript expressions like Math.PI in your JSON. Use the actual numeric values instead.`;
}

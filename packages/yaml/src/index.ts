// Diff
export { diffToPatches } from "./diff";

// Merge
export { deepMergeSpec } from "./merge";

// Streaming YAML compiler
export type { YamlStreamCompiler } from "./parser";
export { createYamlStreamCompiler } from "./parser";

// AI SDK transform
export {
  createYamlTransform,
  pipeYamlRender,
  YAML_SPEC_FENCE,
  YAML_EDIT_FENCE,
  YAML_PATCH_FENCE,
  DIFF_FENCE,
  FENCE_CLOSE,
} from "./transform";

// Prompt generation
export type { YamlPromptOptions } from "./prompt";
export { yamlPrompt } from "./prompt";

import type { Spec } from "./types";

/**
 * Edit mode for modifying an existing spec.
 *
 * - `"patch"` — RFC 6902 JSON Patch. One operation per line.
 * - `"merge"` — RFC 7396 JSON Merge Patch. Partial object deep-merged; `null` deletes.
 * - `"diff"`  — Unified diff (POSIX). Line-level text edits against the serialized spec.
 */
export type EditMode = "patch" | "merge" | "diff";

export interface EditConfig {
  /** Which edit modes are enabled. When >1, the AI chooses per edit. */
  modes: EditMode[];
}

const DEFAULT_MODES: EditMode[] = ["patch"];

function normalizeModes(config?: EditConfig): EditMode[] {
  if (!config?.modes?.length) return DEFAULT_MODES;
  return config.modes;
}

// ── JSON-format instructions ──

function jsonPatchInstructions(): string {
  return [
    "PATCH MODE (RFC 6902 JSON Patch):",
    "Output one JSON object per line. Each line is a patch operation.",
    '- Add: {"op":"add","path":"/elements/new-key","value":{...}}',
    '- Replace: {"op":"replace","path":"/elements/existing-key","value":{...}}',
    '- Remove: {"op":"remove","path":"/elements/old-key"}',
    "Only output patches for what needs to change.",
  ].join("\n");
}

function jsonMergeInstructions(): string {
  return [
    "MERGE MODE (RFC 7396 JSON Merge Patch):",
    "Output a single JSON object on one line with __json_edit set to true.",
    "Include only the keys that changed. Unmentioned keys are preserved.",
    "Set a key to null to delete it.",
    "",
    "Example (update a title and add an element):",
    '{"__json_edit":true,"elements":{"main":{"props":{"title":"New Title"}},"new-el":{"type":"Card","props":{},"children":[]}}}',
    "",
    "Example (delete an element):",
    '{"__json_edit":true,"elements":{"old-widget":null}}',
  ].join("\n");
}

function jsonDiffInstructions(): string {
  return [
    "DIFF MODE (unified diff):",
    "Output a unified diff inside a ```diff code fence.",
    "The diff applies against the JSON-serialized current spec.",
    "",
    "Example:",
    "```diff",
    "--- a/spec.json",
    "+++ b/spec.json",
    "@@ -3,1 +3,1 @@",
    '-      "title": "Login"',
    '+      "title": "Welcome Back"',
    "```",
  ].join("\n");
}

// ── YAML-format instructions ──

function yamlPatchInstructions(): string {
  return [
    "PATCH MODE (RFC 6902 JSON Patch):",
    "Output RFC 6902 JSON Patch lines inside a ```yaml-patch code fence.",
    "Each line is one JSON patch operation.",
    "",
    "Example:",
    "```yaml-patch",
    '{"op":"replace","path":"/elements/main/props/title","value":"New Title"}',
    '{"op":"add","path":"/elements/new-el","value":{"type":"Card","props":{},"children":[]}}',
    "```",
  ].join("\n");
}

function yamlMergeInstructions(): string {
  return [
    "MERGE MODE (RFC 7396 JSON Merge Patch):",
    "Output only the changed parts in a ```yaml-edit code fence.",
    "Uses deep merge semantics: only keys you include are updated. Unmentioned elements and props are preserved.",
    "Set a key to null to delete it.",
    "",
    "Example edit (update title, add a new element):",
    "```yaml-edit",
    "elements:",
    "  main:",
    "    props:",
    "      title: Updated Title",
    "  new-chart:",
    "    type: Card",
    "    props: {}",
    "    children: []",
    "```",
    "",
    "Example deletion:",
    "```yaml-edit",
    "elements:",
    "  old-widget: null",
    "```",
  ].join("\n");
}

function yamlDiffInstructions(): string {
  return [
    "DIFF MODE (unified diff):",
    "Output a unified diff inside a ```diff code fence.",
    "The diff applies against the YAML-serialized current spec.",
    "",
    "Example:",
    "```diff",
    "--- a/spec.yaml",
    "+++ b/spec.yaml",
    "@@ -6,1 +6,1 @@",
    "-      title: Login",
    "+      title: Welcome Back",
    "```",
  ].join("\n");
}

// ── Mode selection guidance ──

function modeSelectionGuidance(modes: EditMode[]): string {
  if (modes.length === 1) return "";
  const parts = ["Choose the best edit strategy for the requested change:"];
  if (modes.includes("patch")) {
    parts.push("- PATCH: best for precise, targeted single-field updates");
  }
  if (modes.includes("merge")) {
    parts.push(
      "- MERGE: best for structural changes (add/remove elements, reparent children, update multiple props at once)",
    );
  }
  if (modes.includes("diff")) {
    parts.push(
      "- DIFF: best for small text-level changes when you can see the exact lines to change",
    );
  }
  return parts.join("\n");
}

/**
 * Generate the prompt section describing available edit modes.
 * Only documents the modes that are enabled.
 */
export function buildEditInstructions(
  config: EditConfig | undefined,
  format: "json" | "yaml",
): string {
  const modes = normalizeModes(config);
  const sections: string[] = [];

  sections.push("EDITING EXISTING SPECS:");
  sections.push("");

  const guidance = modeSelectionGuidance(modes);
  if (guidance) {
    sections.push(guidance);
    sections.push("");
  }

  for (const mode of modes) {
    if (format === "json") {
      switch (mode) {
        case "patch":
          sections.push(jsonPatchInstructions());
          break;
        case "merge":
          sections.push(jsonMergeInstructions());
          break;
        case "diff":
          sections.push(jsonDiffInstructions());
          break;
      }
    } else {
      switch (mode) {
        case "patch":
          sections.push(yamlPatchInstructions());
          break;
        case "merge":
          sections.push(yamlMergeInstructions());
          break;
        case "diff":
          sections.push(yamlDiffInstructions());
          break;
      }
    }
    sections.push("");
  }

  return sections.join("\n");
}

function addLineNumbers(text: string): string {
  const lines = text.split("\n");
  const width = String(lines.length).length;
  return lines
    .map((line, i) => `${String(i + 1).padStart(width)}| ${line}`)
    .join("\n");
}

export function isNonEmptySpec(spec: unknown): spec is Spec {
  if (!spec || typeof spec !== "object") return false;
  const s = spec as Record<string, unknown>;
  return (
    typeof s.root === "string" &&
    typeof s.elements === "object" &&
    s.elements !== null &&
    Object.keys(s.elements as object).length > 0
  );
}

export interface BuildEditUserPromptOptions {
  prompt: string;
  currentSpec?: Spec | null;
  config?: EditConfig;
  format: "json" | "yaml";
  maxPromptLength?: number;
  /** Serialise the spec. Defaults to JSON.stringify for json, must be provided for yaml. */
  serializer?: (spec: Spec) => string;
}

/**
 * Generate the user prompt for edits, including the current spec
 * (with line numbers when diff mode is enabled) and mode instructions.
 */
export function buildEditUserPrompt(
  options: BuildEditUserPromptOptions,
): string {
  const { prompt, currentSpec, config, format, maxPromptLength, serializer } =
    options;

  let userText = String(prompt || "");
  if (maxPromptLength !== undefined && maxPromptLength > 0) {
    userText = userText.slice(0, maxPromptLength);
  }

  if (!isNonEmptySpec(currentSpec)) {
    return userText;
  }

  const modes = normalizeModes(config);
  const showLineNumbers = modes.includes("diff");

  const serialize = serializer ?? ((s: Spec) => JSON.stringify(s, null, 2));
  const specText = serialize(currentSpec);

  const parts: string[] = [];

  if (showLineNumbers) {
    parts.push("CURRENT UI STATE (line numbers for reference):");
    parts.push("```");
    parts.push(addLineNumbers(specText));
    parts.push("```");
  } else {
    parts.push(
      "CURRENT UI STATE (already loaded, DO NOT recreate existing elements):",
    );
    parts.push("```");
    parts.push(specText);
    parts.push("```");
  }

  parts.push("");
  parts.push(`USER REQUEST: ${userText}`);
  parts.push("");

  if (modes.length === 1) {
    const mode = modes[0]!;
    switch (mode) {
      case "patch":
        parts.push(
          format === "yaml"
            ? "Output ONLY the patches in a ```yaml-patch fence."
            : "Output ONLY the JSON Patch lines needed for the change.",
        );
        break;
      case "merge":
        parts.push(
          format === "yaml"
            ? "Output ONLY the changes in a ```yaml-edit fence. Include only keys that need to change."
            : "Output ONLY a single JSON merge line with __json_edit set to true. Include only keys that need to change.",
        );
        break;
      case "diff":
        parts.push("Output ONLY the unified diff in a ```diff fence.");
        break;
    }
  } else {
    const modeNames = modes.map((m) => {
      switch (m) {
        case "patch":
          return format === "yaml" ? "```yaml-patch fence" : "JSON Patch lines";
        case "merge":
          return format === "yaml"
            ? "```yaml-edit fence"
            : "JSON merge line (__json_edit)";
        case "diff":
          return "```diff fence";
      }
    });
    parts.push(
      `Choose the best edit strategy and output using one of: ${modeNames.join(", ")}`,
    );
  }

  return parts.join("\n");
}

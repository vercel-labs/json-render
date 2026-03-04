import type { Spec } from "./types";

/**
 * Options for building a user prompt.
 */
export interface UserPromptOptions {
  /** The user's text prompt */
  prompt: string;
  /** Existing spec to refine (triggers patch-only mode) */
  currentSpec?: Spec | null;
  /** Runtime state context to include */
  state?: Record<string, unknown> | null;
  /** Maximum length for the user's text prompt (applied before wrapping) */
  maxPromptLength?: number;
}

/**
 * Check whether a spec is non-empty (has a root and at least one element).
 */
function isNonEmptySpec(spec: unknown): spec is Spec {
  if (!spec || typeof spec !== "object") return false;
  const s = spec as Record<string, unknown>;
  return (
    typeof s.root === "string" &&
    typeof s.elements === "object" &&
    s.elements !== null &&
    Object.keys(s.elements as object).length > 0
  );
}

const PATCH_INSTRUCTIONS = `IMPORTANT: The current UI is already loaded. Output ONLY the patches needed to make the requested change:
- To add a new element: {"op":"add","path":"/elements/new-key","value":{...}}
- To modify an existing element: {"op":"replace","path":"/elements/existing-key","value":{...}}
- To remove an element: {"op":"remove","path":"/elements/old-key"}
- To update the root: {"op":"replace","path":"/root","value":"new-root-key"}
- To add children: update the parent element with new children array

Output ONLY JSONL patch lines. No prose, no markdown, no code fences.

DO NOT output patches for elements that don't need to change. Only output what's necessary for the requested modification.`;

/**
 * Build a user prompt for AI generation.
 *
 * Handles common patterns that every consuming app needs:
 * - Truncating the user's prompt to a max length
 * - Including the current spec for refinement (patch-only mode)
 * - Including runtime state context
 *
 * @example
 * ```ts
 * // Fresh generation
 * buildUserPrompt({ prompt: "create a todo app" })
 *
 * // Refinement with existing spec
 * buildUserPrompt({ prompt: "add a dark mode toggle", currentSpec: spec })
 *
 * // With state context
 * buildUserPrompt({ prompt: "show my data", state: { todos: [] } })
 * ```
 */
export function buildUserPrompt(options: UserPromptOptions): string {
  const { prompt, currentSpec, state, maxPromptLength } = options;

  // Sanitize and optionally truncate the user's text
  let userText = String(prompt || "");
  if (maxPromptLength !== undefined && maxPromptLength > 0) {
    userText = userText.slice(0, maxPromptLength);
  }

  // --- Refinement mode: currentSpec is provided ---
  if (isNonEmptySpec(currentSpec)) {
    const parts: string[] = [];

    parts.push(
      `CURRENT UI STATE (already loaded, DO NOT recreate existing elements):`,
    );
    parts.push(JSON.stringify(currentSpec, null, 2));
    parts.push("");
    parts.push(`USER REQUEST: ${userText}`);

    // Append state context if provided
    if (state && Object.keys(state).length > 0) {
      parts.push("");
      parts.push(`AVAILABLE STATE:\n${JSON.stringify(state, null, 2)}`);
    }

    parts.push("");
    parts.push(PATCH_INSTRUCTIONS);

    return parts.join("\n");
  }

  // --- Fresh generation mode ---
  const parts: string[] = [userText];

  if (state && Object.keys(state).length > 0) {
    parts.push(`\nAVAILABLE STATE:\n${JSON.stringify(state, null, 2)}`);
  }

  parts.push(
    `\nRemember: Output ONLY JSONL patch lines (no prose, no markdown, no code fences). Output /root first, then interleave /elements and /state patches so the UI fills in progressively as it streams. Output each state patch right after the elements that use it, one per array item.`,
  );

  return parts.join("\n");
}

import type { Spec } from "./types";
import type { EditMode } from "./edit-modes";
import { buildEditUserPrompt, isNonEmptySpec } from "./edit-modes";

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
  /** Edit modes to offer when refining an existing spec. Default: `["patch"]`. */
  editModes?: EditMode[];
}

/**
 * Build a user prompt for AI generation.
 *
 * Handles common patterns that every consuming app needs:
 * - Truncating the user's prompt to a max length
 * - Including the current spec for refinement (edit mode)
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
 * // With multiple edit modes
 * buildUserPrompt({ prompt: "change title", currentSpec: spec, editModes: ["patch", "merge"] })
 * ```
 */
export function buildUserPrompt(options: UserPromptOptions): string {
  const { prompt, currentSpec, state, maxPromptLength, editModes } = options;

  // Sanitize and optionally truncate the user's text
  let userText = String(prompt || "");
  if (maxPromptLength !== undefined && maxPromptLength > 0) {
    userText = userText.slice(0, maxPromptLength);
  }

  // --- Refinement mode: currentSpec is provided ---
  if (isNonEmptySpec(currentSpec)) {
    const editPrompt = buildEditUserPrompt({
      prompt: userText,
      currentSpec,
      config: { modes: editModes ?? ["patch"] },
      format: "json",
    });

    // Append state context if provided
    if (state && Object.keys(state).length > 0) {
      return `${editPrompt}\n\nAVAILABLE STATE:\n${JSON.stringify(state, null, 2)}`;
    }

    return editPrompt;
  }

  // --- Fresh generation mode ---
  const parts: string[] = [userText];

  if (state && Object.keys(state).length > 0) {
    parts.push(`\nAVAILABLE STATE:\n${JSON.stringify(state, null, 2)}`);
  }

  parts.push(
    `\nRemember: Output /root first, then interleave /elements and /state patches so the UI fills in progressively as it streams. Output each state patch right after the elements that use it, one per array item.`,
  );

  return parts.join("\n");
}

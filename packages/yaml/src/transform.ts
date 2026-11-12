import { parse, stringify } from "yaml";
import { applyPatch as applyUnifiedDiff } from "diff";
import {
  applySpecStreamPatch,
  SPEC_DATA_PART_TYPE,
  deepMergeSpec,
  diffToPatches,
  getByPath,
  type JsonPatch,
  type Spec,
  type StreamChunk,
} from "@json-render/core";
import { createYamlStreamCompiler } from "./parser";

export const YAML_SPEC_FENCE = "```yaml-spec";
export const YAML_EDIT_FENCE = "```yaml-edit";
export const YAML_PATCH_FENCE = "```yaml-patch";
export const DIFF_FENCE = "```diff";
export const FENCE_CLOSE = "```";

/** Most bytes that copy patches may add to the working spec in one stream. */
const MAX_COPIED_BYTES = 1_000_000;

/** Approximates the size of a JSON value in bytes, stopping once it passes `limit`. */
function measureBytes(value: unknown, limit: number): number {
  let bytes = 0;
  const stack: unknown[] = [value];
  while (stack.length > 0 && bytes <= limit) {
    const node = stack.pop();
    if (typeof node === "string") {
      bytes += node.length + 2;
    } else if (node && typeof node === "object") {
      bytes += 2;
      for (const [key, child] of Object.entries(node)) {
        bytes += key.length + 4;
        stack.push(child);
      }
    } else {
      bytes += 8;
    }
  }
  return bytes;
}

export interface YamlTransformOptions {
  /** Seed with a previous spec for multi-turn edit support. */
  previousSpec?: Spec;
}

/**
 * Creates a `TransformStream` that intercepts AI SDK UI message stream chunks
 * and converts YAML spec/edit blocks into json-render patch data parts.
 *
 * Two fence types are recognised:
 *
 * 1. **`\`\`\`yaml-spec`** — Full YAML spec. Parsed progressively, emitting
 *    patches as each new property is detected.
 * 2. **`\`\`\`yaml-edit`** — Partial YAML. Deep-merged with the current spec,
 *    then diffed to produce patches. Only changed keys need to be included.
 *
 * Non-fenced text passes through unchanged as `text-delta` chunks, matching
 * the behaviour of `createJsonRenderTransform` from `@json-render/core`.
 */
export function createYamlTransform(
  options?: YamlTransformOptions,
): TransformStream<StreamChunk, StreamChunk> {
  let currentTextId = "";
  let inTextBlock = false;
  let textIdCounter = 0;

  let lineBuffer = "";
  let buffering = false;

  // Fence state
  let fenceMode: "yaml-spec" | "yaml-edit" | "yaml-patch" | "diff" | null =
    null;
  let yamlAccumulated = "";
  let diffAccumulated = "";

  // Streaming compiler for yaml-spec progressive rendering
  let compiler = createYamlStreamCompiler<Record<string, unknown>>();
  let copiedBytes = 0;

  // The "current spec" — built up during yaml-spec, used as base for yaml-edit
  let currentSpec: Record<string, unknown> = options?.previousSpec
    ? structuredClone(
        options.previousSpec as unknown as Record<string, unknown>,
      )
    : {};

  // ── Text block helpers (same pattern as createJsonRenderTransform) ──

  function closeTextBlock(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    if (inTextBlock) {
      controller.enqueue({ type: "text-end", id: currentTextId });
      inTextBlock = false;
    }
  }

  function ensureTextBlock(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    if (!inTextBlock) {
      textIdCounter++;
      currentTextId = String(textIdCounter);
      controller.enqueue({ type: "text-start", id: currentTextId });
      inTextBlock = true;
    }
  }

  function emitTextDelta(
    delta: string,
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    ensureTextBlock(controller);
    controller.enqueue({ type: "text-delta", id: currentTextId, delta });
  }

  function emitPatch(
    patch: JsonPatch,
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    closeTextBlock(controller);
    controller.enqueue({
      type: SPEC_DATA_PART_TYPE,
      data: { type: "patch", patch: structuredClone(patch) },
    });
  }

  function emitPatches(
    patches: JsonPatch[],
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    for (const patch of patches) {
      emitPatch(patch, controller);
    }
  }

  // ── YAML fence processing ──

  /**
   * Feed a line of YAML to the streaming compiler (yaml-spec mode).
   * Emits patches for any newly detected properties.
   */
  function feedYamlSpec(
    line: string,
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    yamlAccumulated += line + "\n";
    const { newPatches } = compiler.push(line + "\n");
    if (newPatches.length > 0) {
      emitPatches(newPatches, controller);
    }
  }

  /**
   * Feed a line of YAML for edit mode. We accumulate all lines and process
   * on fence close since partial edits may not parse until complete.
   */
  function feedYamlEdit(line: string) {
    yamlAccumulated += line + "\n";
  }

  /**
   * Finalise a yaml-edit block: parse the accumulated YAML, deep-merge
   * with the current spec, diff, and emit patches.
   */
  function finaliseYamlEdit(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    try {
      const editObj = parse(yamlAccumulated);
      if (editObj && typeof editObj === "object" && !Array.isArray(editObj)) {
        const merged = deepMergeSpec(
          currentSpec,
          editObj as Record<string, unknown>,
        );
        const patches = diffToPatches(currentSpec, merged);
        if (patches.length > 0) {
          currentSpec = merged;
          emitPatches(patches, controller);
        }
      }
    } catch {
      // Invalid YAML edit block — silently drop
    }
  }

  /**
   * Finalise a yaml-spec block: flush the compiler for any remaining
   * partial data and update currentSpec.
   */
  function finaliseYamlSpec(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    const { newPatches } = compiler.flush();
    if (newPatches.length > 0) {
      emitPatches(newPatches, controller);
    }
    currentSpec = structuredClone(
      compiler.getResult() as Record<string, unknown>,
    );
  }

  /**
   * Finalise a yaml-patch block: parse each accumulated line as an
   * RFC 6902 JSON Patch operation and emit directly.
   */
  function finaliseYamlPatch(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    for (const line of yamlAccumulated.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const patch = JSON.parse(trimmed) as JsonPatch;
        if (!patch.op) continue;
        if (patch.op === "copy" && patch.from) {
          const value = getByPath(currentSpec, patch.from);
          const remaining = MAX_COPIED_BYTES - copiedBytes;
          const bytes = measureBytes(value, remaining);
          if (bytes > remaining) continue;
          copiedBytes += bytes;
          emitPatch(patch, controller);
          applySpecStreamPatch(currentSpec, {
            op: "add",
            path: patch.path,
            value: structuredClone(value),
          });
        } else {
          emitPatch(patch, controller);
          applySpecStreamPatch(currentSpec, patch);
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  }

  /**
   * Finalise a diff block: apply the unified diff to the YAML-serialized
   * current spec, reparse, diff against current, and emit patches.
   */
  function finaliseDiff(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    try {
      const currentYaml = stringify(currentSpec, { indent: 2 });
      const patched = applyUnifiedDiff(currentYaml, diffAccumulated);
      if (patched === false) return;
      const newSpec = parse(patched);
      if (newSpec && typeof newSpec === "object" && !Array.isArray(newSpec)) {
        const patches = diffToPatches(
          currentSpec,
          newSpec as Record<string, unknown>,
        );
        if (patches.length > 0) {
          currentSpec = newSpec as Record<string, unknown>;
          emitPatches(patches, controller);
        }
      }
    } catch {
      // Diff apply or reparse failed
    }
  }

  // ── Line processing ──

  function processCompleteLine(
    line: string,
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    const trimmed = line.trim();

    // Fence open detection
    if (fenceMode === null) {
      if (trimmed.startsWith(YAML_SPEC_FENCE)) {
        fenceMode = "yaml-spec";
        yamlAccumulated = "";
        compiler.reset(currentSpec);
        return;
      }
      if (trimmed.startsWith(YAML_EDIT_FENCE)) {
        fenceMode = "yaml-edit";
        yamlAccumulated = "";
        return;
      }
      if (trimmed.startsWith(YAML_PATCH_FENCE)) {
        fenceMode = "yaml-patch";
        yamlAccumulated = "";
        return;
      }
      if (trimmed.startsWith(DIFF_FENCE)) {
        fenceMode = "diff";
        diffAccumulated = "";
        return;
      }
    }

    // Fence close detection
    if (fenceMode !== null && trimmed === FENCE_CLOSE) {
      if (fenceMode === "yaml-spec") {
        finaliseYamlSpec(controller);
      } else if (fenceMode === "yaml-edit") {
        finaliseYamlEdit(controller);
      } else if (fenceMode === "yaml-patch") {
        finaliseYamlPatch(controller);
      } else if (fenceMode === "diff") {
        finaliseDiff(controller);
      }
      fenceMode = null;
      return;
    }

    // Inside a fence
    if (fenceMode === "yaml-spec") {
      feedYamlSpec(line, controller);
      return;
    }
    if (fenceMode === "yaml-edit") {
      feedYamlEdit(line);
      return;
    }
    if (fenceMode === "yaml-patch") {
      yamlAccumulated += line + "\n";
      return;
    }
    if (fenceMode === "diff") {
      diffAccumulated += line + "\n";
      return;
    }

    // Outside fence — pass through as text
    if (!trimmed) {
      emitTextDelta("\n", controller);
      return;
    }
    emitTextDelta(line + "\n", controller);
  }

  function flushBuffer(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    if (!lineBuffer) return;

    if (fenceMode !== null) {
      processCompleteLine(lineBuffer, controller);
    } else {
      emitTextDelta(lineBuffer, controller);
    }
    lineBuffer = "";
    buffering = false;
  }

  function endTextBlock(
    controller: TransformStreamDefaultController<StreamChunk>,
  ) {
    flushBuffer(controller);
    if (fenceMode === "yaml-spec") {
      finaliseYamlSpec(controller);
    } else if (fenceMode === "yaml-edit") {
      finaliseYamlEdit(controller);
    } else if (fenceMode === "yaml-patch") {
      finaliseYamlPatch(controller);
    } else if (fenceMode === "diff") {
      finaliseDiff(controller);
    }
    fenceMode = null;
    closeTextBlock(controller);
  }

  // ── TransformStream ──

  return new TransformStream<StreamChunk, StreamChunk>({
    transform(chunk, controller) {
      switch (chunk.type) {
        case "text-start": {
          endTextBlock(controller);
          const id = (chunk as { id: string }).id;
          const idNum = parseInt(id, 10);
          if (!isNaN(idNum) && idNum >= textIdCounter) {
            textIdCounter = idNum;
          }
          currentTextId = id;
          inTextBlock = true;
          controller.enqueue(chunk);
          break;
        }

        case "text-delta": {
          const delta = chunk as { id: string; delta: string };
          const text = delta.delta;

          for (let i = 0; i < text.length; i++) {
            const ch = text.charAt(i);

            if (ch === "\n") {
              if (buffering) {
                processCompleteLine(lineBuffer, controller);
                lineBuffer = "";
                buffering = false;
              } else if (fenceMode === null) {
                emitTextDelta("\n", controller);
              }
            } else if (lineBuffer.length === 0 && !buffering) {
              // Inside a fence, buffer everything. Outside, only buffer
              // potential fence-open lines (start with backtick).
              if (fenceMode !== null || ch === "`") {
                buffering = true;
                lineBuffer += ch;
              } else {
                emitTextDelta(ch, controller);
              }
            } else if (buffering) {
              lineBuffer += ch;
            } else {
              emitTextDelta(ch, controller);
            }
          }
          break;
        }

        case "text-end": {
          endTextBlock(controller);
          break;
        }

        case "start-step":
        case "error":
        case "abort": {
          endTextBlock(controller);
          controller.enqueue(chunk);
          break;
        }

        default: {
          controller.enqueue(chunk);
          break;
        }
      }
    },

    flush(controller) {
      endTextBlock(controller);
    },
  });
}

/**
 * Convenience wrapper that pipes an AI SDK UI message stream through the
 * YAML transform, converting YAML spec/edit blocks into json-render patches.
 *
 * Drop-in replacement for `pipeJsonRender` from `@json-render/core`.
 *
 * @example
 * ```ts
 * import { pipeYamlRender } from "@json-render/yaml";
 *
 * const stream = createUIMessageStream({
 *   execute: async ({ writer }) => {
 *     writer.merge(pipeYamlRender(result.toUIMessageStream()));
 *   },
 * });
 * return createUIMessageStreamResponse({ stream });
 * ```
 */
export function pipeYamlRender<T = StreamChunk>(
  stream: ReadableStream<T>,
  options?: YamlTransformOptions,
): ReadableStream<T> {
  return stream.pipeThrough(
    createYamlTransform(options) as unknown as TransformStream<T, T>,
  );
}

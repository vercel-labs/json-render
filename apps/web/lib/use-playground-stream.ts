"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Spec, JsonPatch, EditMode } from "@json-render/core";
import { deepMergeSpec, diffToPatches } from "@json-render/core";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import { applyPatch as applyUnifiedDiff } from "diff";
import {
  createYamlStreamCompiler,
  YAML_SPEC_FENCE,
  YAML_EDIT_FENCE,
  YAML_PATCH_FENCE,
  DIFF_FENCE,
  FENCE_CLOSE,
} from "@json-render/yaml";
import { applySpecPatch } from "./spec-patch";

export type PlaygroundModel = "default" | "typesafe-ai/jev";

export interface CompositionSummary {
  stopReason: "finish" | "limit" | "unavailable";
  elapsedMs: number;
  inputTokens: number | null;
  calls: number;
  estimatedCostUsd: number | null;
}

export type StreamFormat = "jsonl" | "yaml";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
}

export interface UsePlaygroundStreamOptions {
  api: string;
  model?: PlaygroundModel;
  format: StreamFormat;
  editModes?: EditMode[];
  onError?: (error: Error) => void;
  onComplete?: (spec: Spec) => void;
}

export interface UsePlaygroundStreamReturn {
  spec: Spec | null;
  isStreaming: boolean;
  error: Error | null;
  usage: TokenUsage | null;
  composition: CompositionSummary | null;
  rawLines: string[];
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  clear: () => void;
  stop: () => void;
}

// ── JSONL helpers ──

type ParsedLine =
  | { type: "patch"; patch: JsonPatch }
  | { type: "usage"; usage: TokenUsage }
  | { type: "composition"; summary: CompositionSummary }
  | { type: "decision" }
  | { type: "error"; message: string }
  | { type: "json-edit"; mergeObj: Record<string, unknown> }
  | null;

function parseLine(line: string): ParsedLine {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return null;
    const parsed = JSON.parse(trimmed);
    if (parsed.__meta === "composition")
      return { type: "composition", summary: parsed as CompositionSummary };
    if (parsed.__meta === "decision") return { type: "decision" };
    if (parsed.__meta === "error")
      return { type: "error", message: parsed.message };
    if (parsed.__meta === "usage") {
      return {
        type: "usage",
        usage: {
          promptTokens: parsed.promptTokens ?? 0,
          completionTokens: parsed.completionTokens ?? 0,
          totalTokens: parsed.totalTokens ?? 0,
          cachedTokens: parsed.cachedTokens ?? 0,
          cacheWriteTokens: parsed.cacheWriteTokens ?? 0,
        },
      };
    }
    if (parsed.__json_edit === true) {
      const mergeObj = { ...parsed };
      delete mergeObj.__json_edit;
      return { type: "json-edit", mergeObj };
    }
    return { type: "patch", patch: parsed as JsonPatch };
  } catch {
    return null;
  }
}

type FenceState = "outside" | "yaml-spec" | "yaml-edit" | "yaml-patch" | "diff";

// ── Hook ──

export function usePlaygroundStream({
  api,
  model = "default",
  format,
  editModes,
  onError,
  onComplete,
}: UsePlaygroundStreamOptions): UsePlaygroundStreamReturn {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [composition, setComposition] = useState<CompositionSummary | null>(
    null,
  );
  const [rawLines, setRawLines] = useState<string[]>([]);
  const rawLinesRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const modelRef = useRef(model);
  modelRef.current = model;
  const formatRef = useRef(format);
  formatRef.current = format;
  const editModesRef = useRef(editModes);
  editModesRef.current = editModes;

  const stop = useCallback(() => abortControllerRef.current?.abort(), []);
  const clear = useCallback(() => {
    abortControllerRef.current?.abort();
    setSpec(null);
    setError(null);
    setUsage(null);
    setComposition(null);
    rawLinesRef.current = [];
    setRawLines([]);
  }, []);

  const send = useCallback(
    async (prompt: string, context?: Record<string, unknown>) => {
      if (abortControllerRef.current) return;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestModel = modelRef.current;
      const requestFormat =
        requestModel === "typesafe-ai/jev" ? "jsonl" : formatRef.current;
      let compositionComplete = false;

      setIsStreaming(true);
      setError(null);
      setUsage(null);
      setComposition(null);
      rawLinesRef.current = [];
      setRawLines([]);

      const previousSpec = context?.previousSpec as Spec | undefined;
      let currentSpec: Spec =
        previousSpec && previousSpec.root
          ? structuredClone(previousSpec)
          : { root: "", elements: {} };
      setSpec(currentSpec);

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context,
            model: requestModel,
            format: requestFormat,
            editModes: editModesRef.current,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = `HTTP error: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.message) errorMessage = errorData.message;
            else if (errorData.error) errorMessage = errorData.error;
          } catch {
            // use default
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        if (requestFormat === "yaml") {
          // ── YAML streaming ──
          let fenceState: FenceState = "outside";
          const compiler = createYamlStreamCompiler<Record<string, unknown>>();
          let yamlEditAccumulated = "";
          let yamlPatchAccumulated = "";
          let diffAccumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();

              // Check for usage metadata (appended after stream)
              if (trimmed.startsWith("{") && trimmed.includes('"__meta"')) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed.__meta === "usage") {
                    setUsage({
                      promptTokens: parsed.promptTokens ?? 0,
                      completionTokens: parsed.completionTokens ?? 0,
                      totalTokens: parsed.totalTokens ?? 0,
                      cachedTokens: parsed.cachedTokens ?? 0,
                      cacheWriteTokens: parsed.cacheWriteTokens ?? 0,
                    });
                    continue;
                  }
                } catch {
                  // not JSON
                }
              }

              rawLinesRef.current.push(line);

              if (fenceState === "outside") {
                if (
                  trimmed === YAML_SPEC_FENCE ||
                  trimmed.startsWith(YAML_SPEC_FENCE + " ")
                ) {
                  fenceState = "yaml-spec";
                  compiler.reset();
                } else if (
                  trimmed === YAML_EDIT_FENCE ||
                  trimmed.startsWith(YAML_EDIT_FENCE + " ")
                ) {
                  fenceState = "yaml-edit";
                  yamlEditAccumulated = "";
                } else if (
                  trimmed === YAML_PATCH_FENCE ||
                  trimmed.startsWith(YAML_PATCH_FENCE + " ")
                ) {
                  fenceState = "yaml-patch";
                  yamlPatchAccumulated = "";
                } else if (
                  trimmed === DIFF_FENCE ||
                  trimmed.startsWith(DIFF_FENCE + " ")
                ) {
                  fenceState = "diff";
                  diffAccumulated = "";
                }
              } else if (trimmed === FENCE_CLOSE || trimmed === "````") {
                if (fenceState === "yaml-spec") {
                  const { result, newPatches } = compiler.flush();
                  if (result && typeof result === "object" && result.root) {
                    for (const patch of newPatches) {
                      currentSpec = applySpecPatch(currentSpec, patch);
                    }
                    setSpec({ ...currentSpec });
                  }
                } else if (fenceState === "yaml-edit") {
                  try {
                    const editObj = yamlParse(yamlEditAccumulated);
                    if (editObj && typeof editObj === "object") {
                      const merged = deepMergeSpec(
                        currentSpec as unknown as Record<string, unknown>,
                        editObj as Record<string, unknown>,
                      );
                      const patches = diffToPatches(
                        currentSpec as unknown as Record<string, unknown>,
                        merged,
                      );
                      for (const patch of patches) {
                        currentSpec = applySpecPatch(currentSpec, patch);
                      }
                      setSpec({ ...currentSpec });
                    }
                  } catch {
                    // Invalid YAML edit
                  }
                } else if (fenceState === "yaml-patch") {
                  for (const patchLine of yamlPatchAccumulated.split("\n")) {
                    const t = patchLine.trim();
                    if (!t) continue;
                    try {
                      const patch = JSON.parse(t) as JsonPatch;
                      if (patch.op) {
                        currentSpec = applySpecPatch(currentSpec, patch);
                      }
                    } catch {
                      // Skip invalid JSON lines
                    }
                  }
                  setSpec({ ...currentSpec });
                } else if (fenceState === "diff") {
                  try {
                    const specYaml = yamlStringify(currentSpec, { indent: 2 });
                    const patched = applyUnifiedDiff(specYaml, diffAccumulated);
                    if (typeof patched === "string") {
                      const parsed = yamlParse(patched);
                      if (parsed && typeof parsed === "object") {
                        const patches = diffToPatches(
                          currentSpec as unknown as Record<string, unknown>,
                          parsed as Record<string, unknown>,
                        );
                        for (const patch of patches) {
                          currentSpec = applySpecPatch(currentSpec, patch);
                        }
                        setSpec({ ...currentSpec });
                      }
                    }
                  } catch {
                    // Diff apply or reparse failed
                  }
                }
                fenceState = "outside";
              } else if (fenceState === "yaml-spec") {
                const { newPatches } = compiler.push(line + "\n");
                if (newPatches.length > 0) {
                  for (const patch of newPatches) {
                    currentSpec = applySpecPatch(currentSpec, patch);
                  }
                  setSpec({ ...currentSpec });
                }
              } else if (fenceState === "yaml-edit") {
                yamlEditAccumulated += line + "\n";
              } else if (fenceState === "yaml-patch") {
                yamlPatchAccumulated += line + "\n";
              } else if (fenceState === "diff") {
                diffAccumulated += line + "\n";
              }
            }
            setRawLines([...rawLinesRef.current]);
          }

          // Process remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("{") && trimmed.includes('"__meta"')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed.__meta === "usage") {
                  setUsage({
                    promptTokens: parsed.promptTokens ?? 0,
                    completionTokens: parsed.completionTokens ?? 0,
                    totalTokens: parsed.totalTokens ?? 0,
                    cachedTokens: parsed.cachedTokens ?? 0,
                    cacheWriteTokens: parsed.cacheWriteTokens ?? 0,
                  });
                }
              } catch {
                // not JSON
              }
            } else if (fenceState === "yaml-spec") {
              compiler.push(buffer);
              const { result, newPatches } = compiler.flush();
              if (result && typeof result === "object" && result.root) {
                for (const patch of newPatches) {
                  currentSpec = applySpecPatch(currentSpec, patch);
                }
                setSpec({ ...currentSpec });
              }
            }
          }
        } else {
          // ── JSONL streaming ──
          let jsonlDiffState: "outside" | "diff" = "outside";
          let jsonlDiffAccumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // Diff fence detection within JSONL mode
              if (jsonlDiffState === "outside") {
                if (
                  trimmed === DIFF_FENCE ||
                  trimmed.startsWith(DIFF_FENCE + " ")
                ) {
                  jsonlDiffState = "diff";
                  jsonlDiffAccumulated = "";
                  continue;
                }
              } else if (
                jsonlDiffState === "diff" &&
                (trimmed === FENCE_CLOSE || trimmed === "````")
              ) {
                try {
                  const specJson = JSON.stringify(currentSpec, null, 2);
                  const patched = applyUnifiedDiff(
                    specJson,
                    jsonlDiffAccumulated,
                  );
                  if (typeof patched === "string") {
                    const parsed = JSON.parse(patched);
                    if (parsed && typeof parsed === "object") {
                      const patches = diffToPatches(
                        currentSpec as unknown as Record<string, unknown>,
                        parsed as Record<string, unknown>,
                      );
                      for (const patch of patches) {
                        currentSpec = applySpecPatch(currentSpec, patch);
                      }
                      setSpec({ ...currentSpec });
                    }
                  }
                } catch {
                  // Diff apply failed
                }
                jsonlDiffState = "outside";
                continue;
              }

              if (jsonlDiffState === "diff") {
                jsonlDiffAccumulated += line + "\n";
                rawLinesRef.current.push(line);
                continue;
              }

              // Standard JSONL line parsing
              const result = parseLine(trimmed);
              if (!result) continue;
              if (result.type === "usage") {
                setUsage(result.usage);
              } else if (result.type === "error") {
                throw new Error(result.message);
              } else if (result.type === "composition") {
                compositionComplete = true;
                setComposition(result.summary);
                rawLinesRef.current.push(trimmed);
              } else if (result.type === "decision") {
                rawLinesRef.current.push(trimmed);
              } else if (result.type === "json-edit") {
                const merged = deepMergeSpec(
                  currentSpec as unknown as Record<string, unknown>,
                  result.mergeObj,
                );
                const patches = diffToPatches(
                  currentSpec as unknown as Record<string, unknown>,
                  merged,
                );
                for (const patch of patches) {
                  currentSpec = applySpecPatch(currentSpec, patch);
                }
                rawLinesRef.current.push(trimmed);
                setSpec({ ...currentSpec });
              } else {
                rawLinesRef.current.push(trimmed);
                currentSpec = applySpecPatch(currentSpec, result.patch);
                setSpec({ ...currentSpec });
              }
            }
            setRawLines([...rawLinesRef.current]);
          }

          if (buffer.trim()) {
            const trimmed = buffer.trim();
            const result = parseLine(trimmed);
            if (result) {
              if (result.type === "usage") {
                setUsage(result.usage);
              } else if (result.type === "error") {
                throw new Error(result.message);
              } else if (result.type === "composition") {
                compositionComplete = true;
                setComposition(result.summary);
                rawLinesRef.current.push(trimmed);
              } else if (result.type === "decision") {
                rawLinesRef.current.push(trimmed);
              } else if (result.type === "json-edit") {
                const merged = deepMergeSpec(
                  currentSpec as unknown as Record<string, unknown>,
                  result.mergeObj,
                );
                const patches = diffToPatches(
                  currentSpec as unknown as Record<string, unknown>,
                  merged,
                );
                for (const patch of patches) {
                  currentSpec = applySpecPatch(currentSpec, patch);
                }
                rawLinesRef.current.push(trimmed);
                setSpec({ ...currentSpec });
              } else {
                rawLinesRef.current.push(trimmed);
                currentSpec = applySpecPatch(currentSpec, result.patch);
                setSpec({ ...currentSpec });
              }
            }
          }
        }

        setRawLines([...rawLinesRef.current]);
        if (requestModel === "typesafe-ai/jev" && !compositionComplete)
          throw new Error("Composition ended early. The preview is partial.");
        onCompleteRef.current?.(currentSpec);
      } catch (err) {
        setRawLines([...rawLinesRef.current]);
        if ((err as Error).name === "AbortError") {
          setError(new Error("Stopped. The preview is partial."));
          return;
        }
        controller.abort();
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [api],
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    spec,
    isStreaming,
    error,
    usage,
    composition,
    rawLines,
    send,
    clear,
    stop,
  };
}

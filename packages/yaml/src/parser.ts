import { parse } from "yaml";
import type { JsonPatch } from "@json-render/core";
import { diffToPatches } from "./diff";

/**
 * Streaming YAML compiler that incrementally parses YAML text and emits
 * JSON Patch operations for each change detected.
 *
 * Same interface shape as `SpecStreamCompiler` from `@json-render/core`.
 */
export interface YamlStreamCompiler<T> {
  /** Push a chunk of text. Returns the current result and any new patches. */
  push(chunk: string): { result: T; newPatches: JsonPatch[] };
  /** Flush remaining buffer and return the final result. */
  flush(): { result: T; newPatches: JsonPatch[] };
  /** Get the current compiled result. */
  getResult(): T;
  /** Get all patches that have been applied. */
  getPatches(): JsonPatch[];
  /** Reset the compiler to initial state. */
  reset(initial?: Partial<T>): void;
}

/**
 * Create a streaming YAML compiler.
 *
 * Incrementally parses YAML text as it arrives and emits JSON Patch
 * operations by diffing each successful parse against the previous snapshot.
 *
 * Uses `yaml.parse()` with YAML 1.2 defaults (the `yaml` v2 default).
 * YAML 1.2 does not coerce `yes`/`no`/`on`/`off` to booleans.
 *
 * @example
 * ```ts
 * const compiler = createYamlStreamCompiler<Spec>();
 * compiler.push("root: main\n");
 * compiler.push("elements:\n  main:\n    type: Card\n");
 * const { result } = compiler.flush();
 * ```
 */
export function createYamlStreamCompiler<
  T extends Record<string, unknown> = Record<string, unknown>,
>(initial?: Partial<T>): YamlStreamCompiler<T> {
  let accumulated = "";
  let snapshot: Record<string, unknown> = initial
    ? { ...initial }
    : ({} as Record<string, unknown>);
  let result: T = { ...snapshot } as T;
  const allPatches: JsonPatch[] = [];

  function tryParse(): { result: T; newPatches: JsonPatch[] } {
    const newPatches: JsonPatch[] = [];

    try {
      const parsed = parse(accumulated);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const patches = diffToPatches(
          snapshot,
          parsed as Record<string, unknown>,
        );

        if (patches.length > 0) {
          snapshot = structuredClone(parsed as Record<string, unknown>);
          result = { ...snapshot } as T;
          allPatches.push(...patches);
          newPatches.push(...patches);
        }
      }
    } catch {
      // Incomplete YAML — wait for more data
    }

    return { result, newPatches };
  }

  return {
    push(chunk: string): { result: T; newPatches: JsonPatch[] } {
      accumulated += chunk;

      // Only attempt parse when we have a complete line
      if (chunk.includes("\n")) {
        return tryParse();
      }

      return { result, newPatches: [] };
    },

    flush(): { result: T; newPatches: JsonPatch[] } {
      return tryParse();
    },

    getResult(): T {
      return result;
    },

    getPatches(): JsonPatch[] {
      return [...allPatches];
    },

    reset(newInitial?: Partial<T>): void {
      accumulated = "";
      snapshot = newInitial
        ? { ...newInitial }
        : ({} as Record<string, unknown>);
      result = { ...snapshot } as T;
      allPatches.length = 0;
    },
  };
}

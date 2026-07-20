import { computed, isSignal, type Signal } from "@angular/core";
import type { Spec } from "@json-render/core";

import { buildSpecFromParts, getTextFromParts, type DataPart } from "./parts";

/** Reactive result of {@link injectJsonRenderMessage}. */
export interface JsonRenderMessage {
  spec: Spec | null;
  text: string;
  hasSpec: boolean;
}

/**
 * Extract both the json-render spec and text content from a message's parts.
 * The Angular equivalent of the baseline renderers' `useJsonRenderMessage`.
 *
 * Accepts either a static `DataPart[]` or a `Signal<DataPart[]>` (e.g. a signal
 * fed by streaming). Returns a `Signal<JsonRenderMessage>` that recomputes when
 * the parts change.
 */
export function injectJsonRenderMessage(
  parts: DataPart[] | Signal<DataPart[]>,
): Signal<JsonRenderMessage> {
  const partsSignal: Signal<DataPart[]> = isSignal(parts)
    ? parts
    : computed(() => parts);

  return computed<JsonRenderMessage>(() => {
    const current = partsSignal();
    const spec = buildSpecFromParts(current);
    const text = getTextFromParts(current);
    const hasSpec =
      spec !== null && Object.keys(spec.elements || {}).length > 0;
    return { spec, text, hasSpec };
  });
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface OrcaModelOption {
  id: string;
  name: string | null;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  inputModalities: string[];
  reasoningEfforts: string[] | null;
}

export interface OrcaModelsResponse {
  models: OrcaModelOption[];
  source: "live" | "seed";
  degraded: boolean;
  degradedReason: string | null;
  fetchedAt: string | null;
  capability: string;
  requiredInputModalities: string[];
  maskedKey: string | null;
  selectionStillValid: boolean | null;
}

export interface UseOrcaModelsOptions {
  readonly enabled: boolean;
  readonly capability: "chat" | "embedding" | "image" | "video" | "rerank";
  /**
   * Non-text modalities this entry point actually uploads. Changing this
   * recomputes the selector's options.
   */
  readonly requiredInputModalities?: readonly string[];
  /** Currently selected model id, revalidated on every recomputation. */
  readonly selected?: string | null;
}

export interface UseOrcaModelsReturn {
  models: OrcaModelOption[];
  loading: boolean;
  /** The catalog could not be refreshed and a verified fallback is in use. */
  degraded: boolean;
  degradedReason: string | null;
  source: "live" | "seed" | null;
  error: string | null;
  /** True when the previous selection is no longer compatible. */
  selectionInvalidated: boolean;
  maskedKey: string | null;
  refresh: () => void;
}

const EMPTY: OrcaModelOption[] = [];

function modalityKey(modalities: readonly string[] | undefined): string {
  return [...(modalities ?? [])].sort().join(",");
}

/**
 * Fetch the model list for one capability from the server. The API key never
 * reaches the browser; only minimal model metadata does.
 *
 * A live result is authoritative. When discovery fails, the server returns its
 * verified seed and marks the response degraded — the selector never degrades
 * into a free-text field.
 */
export function useOrcaModels(
  options: UseOrcaModelsOptions,
): UseOrcaModelsReturn {
  const { enabled, capability, selected } = options;
  const inputKey = modalityKey(options.requiredInputModalities);

  const [models, setModels] = useState<OrcaModelOption[]>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [degradedReason, setDegradedReason] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "seed" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectionInvalidated, setSelectionInvalidated] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const generationRef = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!enabled) {
      generationRef.current += 1;
      setModels(EMPTY);
      setLoading(false);
      setError(null);
      setDegraded(false);
      setDegradedReason(null);
      setSource(null);
      setSelectionInvalidated(false);
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ capability });
    if (inputKey) params.set("input", inputKey);
    if (selectedRef.current) params.set("selected", selectedRef.current);

    void (async () => {
      try {
        const response = await fetch(
          `/api/orcarouter/models?${params.toString()}`,
          { cache: "no-store" },
        );
        if (generation !== generationRef.current) return;
        if (!response.ok) {
          setModels(EMPTY);
          setLoading(false);
          setError("The OrcaRouter model list could not be loaded.");
          setSelectionInvalidated(false);
          return;
        }
        const payload = (await response.json()) as OrcaModelsResponse;
        if (generation !== generationRef.current) return;
        setModels(payload.models);
        setSource(payload.source);
        setDegraded(payload.degraded);
        setDegradedReason(payload.degradedReason);
        setMaskedKey(payload.maskedKey);
        setSelectionInvalidated(payload.selectionStillValid === false);
        setLoading(false);
      } catch {
        if (generation !== generationRef.current) return;
        setModels(EMPTY);
        setLoading(false);
        setError("The OrcaRouter model list could not be loaded.");
        setSelectionInvalidated(false);
      }
    })();
  }, [capability, enabled, inputKey, reloadToken]);

  const refresh = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  return {
    models,
    loading,
    degraded,
    degradedReason,
    source,
    error,
    selectionInvalidated,
    maskedKey,
    refresh,
  };
}

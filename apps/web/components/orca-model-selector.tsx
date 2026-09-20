"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOrcaModels,
  type OrcaModelOption,
} from "@/lib/orcarouter/use-orca-models";

export interface OrcaModelSelectorProps {
  /** Non-text modalities the current request will upload. */
  requiredInputModalities?: readonly string[];
  value: string | null;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

/**
 * The OrcaRouter model control.
 *
 * Options come from the live catalog for the current capability and are
 * recomputed whenever the provider, capability or attachment modalities change.
 * There is no free-text entry: a model the catalog cannot prove compatible is
 * never offered, and a selection that stops being compatible is cleared.
 */
export function OrcaModelSelector({
  requiredInputModalities,
  value,
  onChange,
  disabled,
}: OrcaModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    models,
    loading,
    degraded,
    degradedReason,
    source,
    error,
    selectionInvalidated,
    refresh,
  } = useOrcaModels({
    enabled: true,
    capability: "chat",
    requiredInputModalities,
    selected: value,
  });

  // A selection that is no longer compatible must be cleared, never kept.
  useEffect(() => {
    if (selectionInvalidated && value) onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionInvalidated, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return models;
    return models.filter(
      (model) =>
        model.id.toLowerCase().includes(needle) ||
        (model.name?.toLowerCase().includes(needle) ?? false),
    );
  }, [models, query]);

  const selected = models.find((model) => model.id === value) ?? null;

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      data-testid="orca-model-selector"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="OrcaRouter model"
        data-testid="orca-model-trigger"
        className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <span className="max-w-44 truncate">
          {selected
            ? selected.id
            : loading
              ? "loading models..."
              : "select model"}
        </span>
        <ChevronDownIcon className="size-2.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="OrcaRouter models"
          data-testid="orca-model-listbox"
          className="absolute bottom-full right-0 z-50 mb-1 w-80 rounded-md border border-border bg-background p-2 shadow-md"
        >
          <div className="mb-1 flex items-center gap-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models"
              spellCheck={false}
              data-testid="orca-model-search"
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh model list"
              data-testid="orca-model-refresh"
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <RefreshCwIcon className="size-3" aria-hidden="true" />
            </button>
          </div>

          <p className="px-1 pb-1 text-[10px] text-muted-foreground">
            {source === "live"
              ? `Live catalog · ${models.length} compatible`
              : degraded
                ? "Degraded · verified fallback list"
                : `${models.length} compatible`}
          </p>
          {degraded && degradedReason && (
            <p className="px-1 pb-1 text-[10px] text-amber-600 dark:text-amber-500">
              {degradedReason}
            </p>
          )}
          {error && (
            <p className="px-1 pb-1 text-[10px] text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <p className="px-1 py-2 text-[11px] text-muted-foreground">
                Loading models...
              </p>
            ) : filtered.length === 0 ? (
              <p
                className="px-1 py-2 text-[11px] text-muted-foreground"
                data-testid="orca-model-empty"
              >
                {models.length === 0
                  ? "No compatible models. Connect OrcaRouter or refresh."
                  : "No model matches that search."}
              </p>
            ) : (
              filtered.map((model: OrcaModelOption) => (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={model.id === value}
                  data-testid="orca-model-option"
                  data-model-id={model.id}
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] font-mono transition-colors hover:bg-muted",
                    model.id === value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <CheckIcon
                    className={cn(
                      "size-3 shrink-0",
                      model.id === value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{model.id}</span>
                  {model.inputModalities.some(
                    (modality) => modality !== "text",
                  ) && (
                    <span className="shrink-0 text-[9px] text-muted-foreground/70">
                      {model.inputModalities
                        .filter((modality) => modality !== "text")
                        .join("+")}
                    </span>
                  )}
                  {model.contextLength && (
                    <span className="shrink-0 text-[9px] text-muted-foreground/70">
                      {Math.round(model.contextLength / 1000)}k
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Check,
  Code,
  Copy,
  GripVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useUIStream, type Spec } from "@json-render/react";
import { DashboardRenderer } from "@/lib/render/renderer";
import { executeAction } from "@/lib/render/registry";
import { CodeHighlight } from "@/components/code-highlight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedBorder } from "@/components/ui/animated-border";

const suggestions = [
  "Customer list with delete",
  "Create customer form",
  "Invoice summary",
  "Revenue metrics",
];

interface WidgetProps {
  id?: string;
  initialPrompt?: string;
  initialSpec?: Spec;
  onGenerated?: () => void;
  onCleared?: () => void;
  onDeleted?: () => void;
  onSaved?: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function Widget({
  id: initialId,
  initialPrompt,
  initialSpec,
  onGenerated,
  onCleared,
  onDeleted,
  onSaved,
  dragHandleProps,
}: WidgetProps): React.ReactElement {
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [state, setState] = useState<Record<string, unknown>>({});
  const [widgetId, setWidgetId] = useState<string | undefined>(initialId);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const promptRef = useRef(prompt);
  const stateRef = useRef(state);
  const editInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auto-focus prompt input for new widgets
  useEffect(() => {
    if (!initialSpec && promptInputRef.current) {
      promptInputRef.current.focus();
    }
  }, [initialSpec]);

  const { spec, isStreaming, error, send, clear } = useUIStream({
    api: "/api/generate",
    onError: (err) => console.error("Widget generation error:", err),
    onComplete: async (completedSpec) => {
      // Save to database when generation completes
      const currentPrompt = promptRef.current;
      if (completedSpec && currentPrompt) {
        try {
          if (widgetId) {
            // Update existing widget
            await fetch(`/api/v1/widgets/${widgetId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: currentPrompt,
                spec: completedSpec,
              }),
            });
          } else {
            // Create new widget
            const res = await fetch("/api/v1/widgets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: currentPrompt,
                spec: completedSpec,
              }),
            });
            const saved = await res.json();
            setWidgetId(saved.id);
            onSaved?.(saved.id);
          }
        } catch (err) {
          console.error("Failed to save widget:", err);
        }
      }
    },
  });

  // Keep promptRef in sync
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  const handleGenerate = useCallback(
    async (text?: string) => {
      const p = text || prompt;
      if (!p.trim()) return;
      if (text) setPrompt(text);
      await send(p, { state });
      onGenerated?.();
    },
    [prompt, send, state, onGenerated],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClear = useCallback(() => {
    clear();
    setPrompt("");
    setState({});
    onCleared?.();
  }, [clear, onCleared]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  const handleEdit = useCallback(() => {
    setEditPrompt("");
    setIsEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (editPrompt.trim()) {
      setIsEditing(false);
      // Pass the current spec so AI can modify it instead of replacing
      const existingSpec = spec || initialSpec;
      await send(editPrompt, { state, previousSpec: existingSpec });
      onGenerated?.();
    }
  }, [editPrompt, send, state, spec, initialSpec, onGenerated]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleEditSubmit();
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    },
    [handleEditSubmit],
  );

  const handleDelete = useCallback(async () => {
    if (widgetId) {
      try {
        await fetch(`/api/v1/widgets/${widgetId}`, { method: "DELETE" });
        toast.success("Widget deleted");
      } catch (err) {
        console.error("Failed to delete widget:", err);
        toast.error("Failed to delete widget");
      }
    }
    setShowDeleteConfirm(false);
    onDeleted?.();
  }, [widgetId, onDeleted]);

  const handleStateChange = useCallback(
    (changes: Array<{ path: string; value: unknown }>) => {
      setState((prev) => {
        const next = { ...prev };
        for (const { path, value } of changes) {
          const parts = path.split("/");
          let current: Record<string, unknown> = next;
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]!;
            if (!(part in current) || typeof current[part] !== "object") {
              current[part] = {};
            }
            current = current[part] as Record<string, unknown>;
          }
          const lastPart = parts[parts.length - 1]!;
          current[lastPart] = value;
        }
        return next;
      });
    },
    [],
  );

  // Use spec from stream, or initial spec for saved widgets
  const currentSpec = spec || initialSpec;

  // Auto-run initial actions when spec loads (for saved widgets)
  useEffect(() => {
    if (!currentSpec || isStreaming) return;

    // Check for initialActions in spec metadata
    const specWithMeta = currentSpec as Spec & {
      initialActions?: Array<{
        action: string;
        params?: Record<string, unknown>;
      }>;
    };
    if (specWithMeta.initialActions) {
      specWithMeta.initialActions.forEach(({ action, params }) => {
        executeAction(action, params, setState);
      });
      return;
    }

    // Auto-detect: find Tables/Charts and run their data-fetching actions
    const elements = currentSpec.elements || {};
    const dataComponents = ["Table", "BarChart", "LineChart"];
    const actionsRun = new Set<string>();

    for (const el of Object.values(elements)) {
      const element = el as { type: string; props?: Record<string, unknown> };
      if (dataComponents.includes(element.type) && element.props?.statePath) {
        const statePath = element.props.statePath as string;
        // Extract resource name (e.g., "customers" from "customers.data")
        const resource = statePath.split(".")[0];
        if (!resource || actionsRun.has(resource)) continue;
        // Find a button that loads this data
        for (const btnEl of Object.values(elements)) {
          const btn = btnEl as {
            type: string;
            props?: Record<string, unknown>;
          };
          if (btn.type === "Button" && btn.props?.action) {
            const action = btn.props.action as string;
            if (
              action.toLowerCase().includes(resource) &&
              (action.startsWith("view") ||
                action.startsWith("refresh") ||
                action.startsWith("load"))
            ) {
              // Run this action with its params
              executeAction(
                action,
                btn.props.actionParams as Record<string, unknown>,
                setState,
              );
              actionsRun.add(resource);
              break;
            }
          }
        }
      }
    }
  }, [currentSpec, isStreaming]);
  const hasContent =
    currentSpec && Object.keys(currentSpec.elements).length > 0;

  // Title derived from prompt
  const title = prompt.trim() || "New Widget";

  const handleCopyCode = async () => {
    if (currentSpec) {
      await navigator.clipboard.writeText(JSON.stringify(currentSpec, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="group relative flex flex-col aspect-[4/3] py-0 gap-0">
      {isStreaming && <AnimatedBorder />}
      {/* Title bar */}
      <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="h-6 w-6 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <span className="text-sm font-medium truncate flex-1" title={title}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Hover actions */}
          {hasContent && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={() => setShowCode(!showCode)}
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 text-muted-foreground hover:text-foreground ${showCode ? "bg-muted" : ""}`}
                title={showCode ? "Show preview" : "Show code"}
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={handleEdit}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <CardContent className="relative flex-1 overflow-auto p-4">
        {error ? (
          <div className="text-destructive text-sm">{error.message}</div>
        ) : !hasContent && !isStreaming ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <p className="text-muted-foreground text-sm">Try one of these:</p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px]">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  onClick={() => handleGenerate(s)}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : currentSpec ? (
          showCode ? (
            <div className="relative h-full">
              <Button
                onClick={handleCopyCode}
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Copy code"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <CodeHighlight code={JSON.stringify(currentSpec, null, 2)} />
            </div>
          ) : (
            <DashboardRenderer
              spec={currentSpec}
              state={state}
              setState={setState}
              onStateChange={handleStateChange}
              loading={isStreaming}
            />
          )
        ) : null}

        {/* Edit overlay */}
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="w-full max-w-sm px-4">
              <div className="flex items-center gap-2">
                <Input
                  ref={editInputRef}
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  placeholder="Update widget prompt..."
                  className="flex-1 text-sm"
                  autoFocus
                />
                <Button onClick={handleEditSubmit} size="sm">
                  Go
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Prompt input at bottom - only show for new widgets */}
      {!hasContent && (
        <div className="p-3 border-t flex gap-2">
          <Input
            ref={promptInputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe this widget..."
            disabled={isStreaming}
            className="flex-1 text-sm"
          />
          <Button
            onClick={() => handleGenerate()}
            disabled={isStreaming || !prompt.trim()}
            size="sm"
          >
            {isStreaming ? "..." : "Go"}
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete widget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this widget? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

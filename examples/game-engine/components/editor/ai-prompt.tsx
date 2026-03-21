"use client";

import { useState, useRef, useMemo } from "react";
import { MessageSquare, X, ArrowUp, Loader2 } from "lucide-react";
import { deepMergeSpec } from "@json-render/core";
import type { Spec } from "@json-render/core";
import { parse } from "yaml";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";
import { sceneToSpec } from "@/lib/scene-to-spec";
import { specToSceneObjects } from "@/lib/spec-to-scene";

function stripFences(text: string): string {
  return text
    .replace(/```yaml-edit\s*\n?/g, "")
    .replace(/```yaml-spec\s*\n?/g, "")
    .replace(/```\s*$/gm, "")
    .trim();
}

export function AIPrompt() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [previousPrompts, setPreviousPrompts] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);
  const replaceSceneObjects = useEditorStore((s) => s.replaceSceneObjects);
  const setIsPromptOpen = useEditorStore((s) => s.setIsPromptOpen);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId),
    [scenes, activeSceneId],
  );

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing || !activeScene) return;

    setIsProcessing(true);
    setMessage("Thinking...");
    setIsPromptOpen(true);

    try {
      const currentSpec = sceneToSpec(activeScene);

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          spec: currentSpec,
          previousPrompts,
        }),
      });

      if (!res.ok) {
        setMessage("Error: " + res.statusText);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";
      let lastAppliedJson = "";
      const baseSpec = JSON.parse(JSON.stringify(currentSpec));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        if (!chunk.includes("\n")) continue;

        const stripped = stripFences(accumulated);
        if (!stripped) continue;

        try {
          const editObj = parse(stripped);
          if (
            editObj &&
            typeof editObj === "object" &&
            !Array.isArray(editObj)
          ) {
            const editJson = JSON.stringify(editObj);
            if (editJson === lastAppliedJson) continue;
            lastAppliedJson = editJson;

            const merged = deepMergeSpec(
              JSON.parse(JSON.stringify(baseSpec)),
              editObj as Record<string, unknown>,
            );
            const patchedSpec = merged as unknown as Spec;
            const newObjects = specToSceneObjects(patchedSpec);
            if (newObjects.length > 0) {
              replaceSceneObjects(newObjects);
            }
          }
        } catch {
          // Incomplete YAML — wait for more data
        }
      }

      // Final parse to catch any remaining content
      const stripped = stripFences(accumulated);
      if (stripped) {
        try {
          const editObj = parse(stripped);
          if (
            editObj &&
            typeof editObj === "object" &&
            !Array.isArray(editObj)
          ) {
            const merged = deepMergeSpec(
              JSON.parse(JSON.stringify(baseSpec)),
              editObj as Record<string, unknown>,
            );
            const patchedSpec = merged as unknown as Spec;
            const newObjects = specToSceneObjects(patchedSpec);
            if (newObjects.length > 0) {
              replaceSceneObjects(newObjects);
            }
          }
        } catch {
          // Parse failed
        }
      }

      setPreviousPrompts((prev) => [...prev, prompt]);
      setMessage("Done");
      setPrompt("");
    } catch {
      setMessage("Error occurred");
    } finally {
      setIsProcessing(false);
      setIsPromptOpen(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className={`absolute bottom-4 right-4 z-10 ${isMobile ? "w-11 h-11" : "w-9 h-9"} flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors backdrop-blur-sm`}
        title="AI Scene Editor"
      >
        <MessageSquare size={isMobile ? 18 : 16} />
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-4 right-4 z-10 ${isMobile ? "left-4 right-4 w-auto" : "w-80"}`}
    >
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
          <span className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">
            AI Scene Editor
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-[#666] hover:text-white active:text-white"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Describe scene changes..."
              disabled={isProcessing}
              className={`flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 ${isMobile ? "py-2.5 text-base" : "py-1.5 text-xs"} text-[#ccc] outline-none focus:border-[#555] placeholder:text-[#444] disabled:opacity-50`}
            />
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !prompt.trim()}
              className={`${isMobile ? "p-2.5" : "p-1.5"} rounded bg-white/10 hover:bg-white/20 active:bg-white/30 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
            >
              {isProcessing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowUp size={14} />
              )}
            </button>
          </div>
          {message && (
            <div className="mt-2 text-[10px] text-[#666] flex items-center gap-1.5">
              {isProcessing && <Loader2 size={10} className="animate-spin" />}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

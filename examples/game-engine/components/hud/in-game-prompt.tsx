"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { ArrowUp, Loader2, MessageSquare } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";
import type {
  ObjectType,
  TransformMode,
  SceneObject,
  Material,
  Physics,
  Damage,
} from "@/lib/types";

export function InGamePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previousPrompts, setPreviousPrompts] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const {
    addObject,
    scenes,
    activeSceneId,
    updateObjectTransform,
    updateObjectMaterial,
    updateObjectPhysics,
    updateDamage,
    selectObject,
    setTransformMode,
    createCustomObject,
    isPlaying,
    setIsPromptOpen,
  } = useEditorStore();

  const activeScene =
    scenes.find((scene) => scene.id === activeSceneId) || scenes[0];
  const objects = activeScene ? activeScene.objects : [];

  const processAction = (action: { function: string; args: unknown[] }) => {
    try {
      switch (action.function) {
        case "addObject":
          addObject(action.args[0] as ObjectType);
          break;
        case "createCustomObject":
          createCustomObject(
            action.args[0] as ObjectType,
            action.args[1] as Partial<SceneObject>,
          );
          break;
        case "updateObjectTransform":
          updateObjectTransform(
            action.args[0] as string,
            action.args[1] as Partial<
              Pick<SceneObject, "position" | "rotation" | "scale">
            >,
          );
          break;
        case "updateObjectMaterial":
          updateObjectMaterial(
            action.args[0] as string,
            action.args[1] as Partial<Material>,
          );
          break;
        case "updateObjectPhysics":
          updateObjectPhysics(
            action.args[0] as string,
            action.args[1] as Partial<Physics>,
          );
          break;
        case "updateDamage":
          updateDamage(
            action.args[0] as string,
            action.args[1] as Partial<Damage>,
          );
          break;
        case "selectObject":
          selectObject(action.args[0] as string);
          break;
        case "setTransformMode":
          setTransformMode(action.args[0] as TransformMode);
          break;
      }
    } catch (error) {
      console.error("Error processing action:", error, action);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);
    const currentPrompt = prompt;
    setPreviousPrompts((prev) => [...prev.slice(-4), currentPrompt]);
    setIsOpen(false);
    setIsPromptOpen(false);

    try {
      const response = await fetch("/api/ai-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          objects,
          previousPrompts,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get AI response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        let startIndex = 0;
        while (true) {
          const openBrace = buffer.indexOf("{", startIndex);
          if (openBrace === -1) break;

          let depth = 0;
          let closeBrace = -1;

          for (let i = openBrace; i < buffer.length; i++) {
            if (buffer[i] === "{") depth++;
            else if (buffer[i] === "}") {
              depth--;
              if (depth === 0) {
                closeBrace = i;
                break;
              }
            }
          }

          if (closeBrace === -1) {
            startIndex = openBrace + 1;
            break;
          }

          const jsonStr = buffer.substring(openBrace, closeBrace + 1);

          try {
            const jsonObj = JSON.parse(jsonStr);
            if (
              jsonObj &&
              typeof jsonObj.function === "string" &&
              Array.isArray(jsonObj.args)
            ) {
              processAction(jsonObj);
            }
            buffer =
              buffer.substring(0, openBrace) + buffer.substring(closeBrace + 1);
            startIndex = 0;
          } catch {
            startIndex = openBrace + 1;
          }
        }
      }
    } catch (error) {
      console.error("Error processing AI prompt:", error);
    } finally {
      setIsProcessing(false);
      setPrompt("");
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setIsOpen(false);
      setIsPromptOpen(false);
      return;
    }

    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);
        setIsPromptOpen(newIsOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isOpen, setIsPromptOpen, isMobile]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  if (!isPlaying) return null;

  if (!isOpen) {
    if (isMobile) {
      return (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsPromptOpen(true);
          }}
          className="absolute top-14 right-3 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/70 active:bg-white/20 border border-white/10"
        >
          <MessageSquare size={18} />
        </button>
      );
    }
    return null;
  }

  return (
    <div
      className={`absolute ${isMobile ? "top-14 left-2 right-2 bottom-auto" : "top-[50px] left-0 right-0 bottom-0 flex items-center justify-center"} z-40 animate-fade-in`}
    >
      <div className="flex items-center justify-center">
        <div
          className={`flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/20 ${isMobile ? "rounded-xl w-full" : "rounded-full"} shadow-lg overflow-hidden ${isMobile ? "" : "max-w-[600px]"}`}
        >
          <div className={isMobile ? "pl-3" : "pl-5"}>
            <MessageSquare className="h-5 w-5 text-white/70" />
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex items-center flex-1 min-w-0"
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe what to add or change..."
              className={`bg-transparent border-none px-3 py-4 ${isMobile ? "flex-1 min-w-0 text-base" : "w-[400px] text-sm"} text-white placeholder-gray-400 focus:outline-none resize-none overflow-hidden min-h-[44px] max-h-[200px]`}
              rows={1}
              style={{ height: "auto" }}
            />
            <div className="flex items-center gap-1 mr-3">
              <button
                type="submit"
                className="bg-white/15 text-white p-2 rounded-full hover:bg-white/25 active:bg-white/35 transition-colors disabled:opacity-30"
                disabled={!prompt.trim() || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

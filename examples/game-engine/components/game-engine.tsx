"use client";

import { useMemo, useEffect, Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ThreeRenderer } from "@json-render/react-three-fiber";
import { Braces, SlidersHorizontal, X } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";
import { registry } from "@/lib/registry";
import { sceneToSpec } from "@/lib/scene-to-spec";
import { Toolbar } from "@/components/editor/toolbar";
import { SceneInspector } from "@/components/editor/scene-inspector";
import { AddObjectButton } from "@/components/editor/add-object-button";
import { EditorControls } from "@/components/editor/transform-controls";
import { JsonPane } from "@/components/editor/json-pane";
import { AIPrompt } from "@/components/editor/ai-prompt";
import { HealthBar } from "@/components/hud/health-bar";
import { DamageEffect } from "@/components/hud/damage-effect";
import { GameOverScreen } from "@/components/hud/game-over";
import { CharacterDialog } from "@/components/hud/character-dialog";
import { InteractionPrompt } from "@/components/hud/interaction-prompt";
import { InGamePrompt } from "@/components/hud/in-game-prompt";
import { DamageSound } from "@/components/hud/damage-sound";
import { DeathSound } from "@/components/hud/death-sound";
import { LoadingSpinner } from "@/components/hud/loading-spinner";
import { TouchControls } from "@/components/hud/touch-controls";
import { CharacterInteraction } from "@/components/game/character-interaction";
import { DropZone } from "@/components/editor/drop-zone";

export function GameEngine() {
  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const health = useEditorStore((s) => s.health);
  const lastDamageTime = useEditorStore((s) => s.lastDamageTime);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const removeObject = useEditorStore((s) => s.removeObject);
  const isMobile = useIsMobile();

  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || scenes[0],
    [scenes, activeSceneId],
  );

  const spec = useMemo(() => {
    if (!activeScene) return null;
    return sceneToSpec(activeScene);
  }, [activeScene]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "Enter") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }

      if (isMod && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        if (selectedObjectId && !isPlaying) {
          removeObject(selectedObjectId);
        }
        return;
      }

      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (isMod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying, selectedObjectId, removeObject, undo, redo]);

  useEffect(() => {
    if (isPlaying) {
      setLeftDrawer(false);
      setRightDrawer(false);
    }
  }, [isPlaying]);

  const showSidebars = !isPlaying;

  return (
    <div className="h-dvh w-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 min-h-0 relative">
        {/* Left sidebar - JSON Pane (desktop only) */}
        {showSidebars && (
          <div className="hidden sm:block w-72 shrink-0 border-r border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden">
            <JsonPane />
          </div>
        )}

        {/* Mobile left drawer */}
        {showSidebars && (
          <>
            <div
              className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-200 ${leftDrawer ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              onClick={() => setLeftDrawer(false)}
            />
            <div
              className={`fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#0f0f0f] border-r border-[#1e1e1e] z-40 overflow-hidden transition-transform duration-200 ease-out ${leftDrawer ? "translate-x-0" : "-translate-x-full"}`}
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
                <span className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">
                  JSON Spec
                </span>
                <button
                  onClick={() => setLeftDrawer(false)}
                  className="p-1.5 text-[#666] hover:text-white active:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <JsonPane />
            </div>
          </>
        )}

        {/* Canvas area */}
        <div className="flex-1 relative min-w-0 safe-bottom">
          <DropZone />
          <Canvas
            shadows
            camera={{ position: [5, 5, 5], fov: 50 }}
            style={{ width: "100%", height: "100%", touchAction: "none" }}
          >
            <Suspense fallback={null}>
              {isPlaying ? (
                <Physics gravity={[0, -9.81, 0]}>
                  <ThreeRenderer spec={spec} registry={registry} />
                  <CharacterInteraction />
                </Physics>
              ) : (
                <>
                  <ThreeRenderer spec={spec} registry={registry} />
                  <EditorControls />
                </>
              )}
            </Suspense>
          </Canvas>

          {/* Mobile drawer toggle buttons */}
          {showSidebars && (
            <>
              <button
                onClick={() => setLeftDrawer(true)}
                className="sm:hidden absolute top-2 left-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/30 text-white transition-colors backdrop-blur-sm"
              >
                <Braces size={18} />
              </button>
              <button
                onClick={() => setRightDrawer(true)}
                className="sm:hidden absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/30 text-white transition-colors backdrop-blur-sm"
              >
                <SlidersHorizontal size={18} />
              </button>
            </>
          )}

          {!isPlaying && <AddObjectButton />}
          {!isPlaying && <AIPrompt />}

          <LoadingSpinner />

          {isPlaying && <HealthBar />}
          {isPlaying && <DamageEffect lastDamageTime={lastDamageTime} />}
          {isPlaying && health <= 0 && <GameOverScreen />}
          {isPlaying && <CharacterDialog />}
          {isPlaying && <InteractionPrompt />}
          {isPlaying && <InGamePrompt />}
          {isPlaying && isMobile && <TouchControls />}
          <DamageSound />
          <DeathSound />
        </div>

        {/* Right sidebar - Inspector (desktop only) */}
        {showSidebars && (
          <div className="hidden sm:block w-72 shrink-0 border-l border-[#1e1e1e] bg-[#0f0f0f] overflow-y-auto">
            <SceneInspector />
          </div>
        )}

        {/* Mobile right drawer */}
        {showSidebars && (
          <>
            <div
              className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-200 ${rightDrawer ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              onClick={() => setRightDrawer(false)}
            />
            <div
              className={`fixed right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#0f0f0f] border-l border-[#1e1e1e] z-40 overflow-y-auto transition-transform duration-200 ease-out ${rightDrawer ? "translate-x-0" : "translate-x-full"}`}
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
                <span className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">
                  Inspector
                </span>
                <button
                  onClick={() => setRightDrawer(false)}
                  className="p-1.5 text-[#666] hover:text-white active:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <SceneInspector />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Copy, Trash2 } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";

export function SceneDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const {
    scenes,
    activeSceneId,
    setActiveScene,
    createScene,
    duplicateScene,
    deleteScene,
  } = useEditorStore();

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const isMobile = useIsMobile();

  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#ccc] hover:text-white hover:bg-white/5 transition-colors"
      >
        <span className="truncate max-w-[120px]">{activeScene?.name}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => {
              createScene(`Scene ${scenes.length + 1}`);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 ${isMobile ? "py-2.5" : "py-2"} text-xs text-[#ccc] hover:bg-white/5 hover:text-white active:bg-white/10 transition-colors`}
          >
            <Plus size={12} />
            New Scene
          </button>

          <div className="h-px bg-[#2a2a2a]" />

          <div className="max-h-60 overflow-y-auto py-1">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`group flex items-center justify-between px-3 ${isMobile ? "py-2.5" : "py-1.5"} cursor-pointer text-xs transition-colors ${
                  scene.id === activeSceneId
                    ? "bg-white/8 text-white"
                    : "text-[#888] hover:text-[#ccc] hover:bg-white/3"
                }`}
                onClick={() => {
                  setActiveScene(scene.id);
                  setOpen(false);
                }}
              >
                <span className="truncate">{scene.name}</span>
                <div
                  className={`${isMobile ? "flex" : "hidden group-hover:flex"} items-center gap-0.5`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateScene(scene.id);
                    }}
                    className={`${isMobile ? "p-1.5" : "p-0.5"} text-[#666] hover:text-white active:text-white`}
                    title="Duplicate"
                  >
                    <Copy size={isMobile ? 14 : 10} />
                  </button>
                  {scenes.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScene(scene.id);
                      }}
                      className={`${isMobile ? "p-1.5" : "p-0.5"} text-[#666] hover:text-red-400 active:text-red-400`}
                      title="Delete"
                    >
                      <Trash2 size={isMobile ? 14 : 10} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Copy, Trash2, Plus } from "lucide-react";
import { useEditorStore } from "@/lib/store";

export function SceneSelector() {
  const {
    scenes,
    activeSceneId,
    setActiveScene,
    createScene,
    duplicateScene,
    deleteScene,
  } = useEditorStore();

  return (
    <div className="flex flex-col h-full">
      <div className="h-9 flex items-center justify-between px-3 border-b border-[#1e1e1e] flex-shrink-0">
        <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider font-mono">
          Scenes
        </span>
        <button
          onClick={() => createScene(`Scene ${scenes.length + 1}`)}
          className="p-1 text-[#666] hover:text-white transition-colors"
          title="New scene"
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={`group flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs ${
              scene.id === activeSceneId
                ? "bg-white/8 text-white border-l-2 border-white"
                : "text-[#888] hover:text-[#ccc] border-l-2 border-transparent"
            }`}
            onClick={() => setActiveScene(scene.id)}
          >
            <span className="truncate">{scene.name}</span>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateScene(scene.id);
                }}
                className="p-0.5 text-[#666] hover:text-white"
                title="Duplicate"
              >
                <Copy size={10} />
              </button>
              {scenes.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScene(scene.id);
                  }}
                  className="p-0.5 text-[#666] hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

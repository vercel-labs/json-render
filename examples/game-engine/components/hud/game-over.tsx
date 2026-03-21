"use client";

import { useEditorStore } from "@/lib/store";

export function GameOverScreen() {
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setHealth = useEditorStore((s) => s.setHealth);
  const setShield = useEditorStore((s) => s.setShield);
  const maxHealth = useEditorStore((s) => s.maxHealth);
  const maxShield = useEditorStore((s) => s.maxShield);

  const handleRestart = () => {
    setHealth(maxHealth);
    setShield(maxShield);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  };

  const handleExit = () => {
    setHealth(maxHealth);
    setShield(maxShield);
    setIsPlaying(false);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 animate-fade-in">
      <div className="text-center px-4">
        <h1 className="text-3xl sm:text-5xl font-bold text-red-500 mb-2">
          GAME OVER
        </h1>
        <p className="text-[#888] mb-8 text-sm sm:text-base">
          You have been defeated
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRestart}
            className="px-6 py-2.5 sm:py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg text-sm transition-colors min-w-[100px]"
          >
            Restart
          </button>
          <button
            onClick={handleExit}
            className="px-6 py-2.5 sm:py-2 bg-white/5 hover:bg-white/10 active:bg-white/20 text-[#888] rounded-lg text-sm transition-colors min-w-[100px]"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

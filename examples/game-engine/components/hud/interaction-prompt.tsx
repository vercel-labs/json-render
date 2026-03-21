"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";

export function InteractionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isPlaying) {
      setShowPrompt(false);
      return;
    }

    const handleNearby = () => setShowPrompt(true);
    const handleFar = () => setShowPrompt(false);
    const handleDialogOpen = () => setShowPrompt(false);

    window.addEventListener("character-nearby", handleNearby);
    window.addEventListener("character-far", handleFar);
    window.addEventListener("dialog-open", handleDialogOpen);

    return () => {
      window.removeEventListener("character-nearby", handleNearby);
      window.removeEventListener("character-far", handleFar);
      window.removeEventListener("dialog-open", handleDialogOpen);
    };
  }, [isPlaying]);

  if (!isPlaying || !showPrompt) return null;

  if (isMobile) {
    return (
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent("request-character-interact"));
        }}
        className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-medium active:bg-white/40 border border-white/30"
      >
        Tap to interact
      </button>
    );
  }

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white px-4 py-2 rounded-md text-sm">
      Press &quot;E&quot; to interact
    </div>
  );
}

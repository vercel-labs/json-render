"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/lib/store";

const DEATH_SOUND_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/death-y5RAJQHhGgzagKglqKEYKzMFc84QcR.mp3";

export function DeathSound() {
  const health = useEditorStore((s) => s.health);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [prevHealth, setPrevHealth] = useState(100);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.src = DEATH_SOUND_URL;
    audio.preload = "auto";
    audio.addEventListener("canplaythrough", () => setLoaded(true));
    audio.addEventListener("error", () => setLoaded(false));
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (
      isPlaying &&
      prevHealth > 0 &&
      health <= 0 &&
      audioRef.current &&
      loaded
    ) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.7;
      audioRef.current.play().catch(() => {});
    }
    setPrevHealth(health);
  }, [health, isPlaying, prevHealth, loaded]);

  return null;
}

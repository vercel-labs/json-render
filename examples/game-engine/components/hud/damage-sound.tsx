"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/lib/store";

const DAMAGE_SOUND_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hit-OaUo19QcLdyFfqy5SMfEWyAF3ZgyxR.mp3";

export function DamageSound() {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const lastDamageTime = useEditorStore((s) => s.lastDamageTime);
  const health = useEditorStore((s) => s.health);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.src = DAMAGE_SOUND_URL;
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
    if (!isPlaying || !lastDamageTime || health <= 0 || !loaded) return;

    const now = Date.now();
    if (now - lastPlayedRef.current < 300) return;
    lastPlayedRef.current = now;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    }
  }, [isPlaying, lastDamageTime, health, loaded]);

  return null;
}

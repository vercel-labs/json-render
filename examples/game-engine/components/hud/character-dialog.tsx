"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { useIsMobile } from "@/lib/use-mobile";

interface DialogMessage {
  text: string;
  audioUrl?: string;
}

export function CharacterDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [characterRole, setCharacterRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    const handleInteract = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        id?: string;
        role?: string;
        messages?: DialogMessage[];
      };

      setCharacterRole(detail?.role || "NPC");
      setCurrentIndex(0);
      setIsOpen(true);
      window.dispatchEvent(new CustomEvent("dialog-open"));

      if (detail?.messages && detail.messages.length > 0) {
        setMessages(detail.messages);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        fetchCharacterResponses(detail?.role || "villager").then(
          (responses) => {
            setMessages(responses);
            setIsLoading(false);
          },
        );
      }
    };

    window.addEventListener("character-interact", handleInteract);
    return () =>
      window.removeEventListener("character-interact", handleInteract);
  }, []);

  useEffect(() => {
    if (!isLoading && messages.length > 0 && !isMuted && audioRef.current) {
      const current = messages[currentIndex];
      if (current?.audioUrl) {
        audioRef.current.src = current.audioUrl;
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentIndex, messages, isLoading, isMuted]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setMessages([]);
    setCurrentIndex(0);
    if (audioRef.current) audioRef.current.pause();
    window.dispatchEvent(new CustomEvent("dialog-close"));
  }, []);

  const handleNext = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (currentIndex < messages.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleClose();
    }
  }, [currentIndex, messages.length, handleClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        handleNext();
      } else if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, handleNext, handleClose]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      if (!isMuted) {
        audioRef.current.pause();
      } else if (messages[currentIndex]?.audioUrl) {
        audioRef.current.src = messages[currentIndex].audioUrl!;
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[480px] max-w-[90vw]">
        <div className="bg-[#111]/95 border border-[#333] rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-2">
            <span className="text-[10px] text-[#666] uppercase tracking-wider">
              {characterRole}
            </span>
            <button
              onClick={handleClose}
              className="p-1.5 text-[#666] hover:text-white active:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <div className="animate-pulse h-4 bg-[#222] rounded w-3/4 mb-2" />
          <div className="animate-pulse h-4 bg-[#222] rounded w-1/2" />
          <p className="text-[9px] text-[#555] mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) return null;

  const current = messages[currentIndex];
  const isLast = currentIndex >= messages.length - 1;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[480px] max-w-[90vw]">
      <div className="bg-[#111]/95 border border-[#333] rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] text-[#666] uppercase tracking-wider">
            {characterRole || "NPC"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 text-[#666] hover:text-white active:text-white"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-[#666] hover:text-white active:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <p className="text-sm text-[#ddd] leading-relaxed">{current?.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] text-[#555]">
            {currentIndex + 1} / {messages.length}
          </span>
          {isMobile ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs text-[#888] bg-white/5 rounded active:bg-white/15"
              >
                Close
              </button>
              {!isLast && (
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 text-xs text-white bg-white/10 rounded active:bg-white/25"
                >
                  Next
                </button>
              )}
            </div>
          ) : (
            <span className="text-[9px] text-[#555]">
              {isLast
                ? "Press Enter or Esc to close"
                : "Press Enter to continue"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchCharacterResponses(
  role: string,
): Promise<{ text: string; audioUrl?: string }[]> {
  try {
    const res = await fetch("/api/character-responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error("Failed to fetch responses");
    const data = await res.json();
    return (
      data.messages || [
        { text: "Hello there! How can I help you?" },
        { text: "It's a beautiful day, isn't it?" },
      ]
    );
  } catch {
    return [
      { text: "Hello there! How can I help you?" },
      { text: "It's a beautiful day, isn't it?" },
    ];
  }
}

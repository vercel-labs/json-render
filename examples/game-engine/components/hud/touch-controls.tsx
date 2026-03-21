"use client";

import { useEffect, useRef, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { touchMoveState } from "@/lib/touch-state";
import { useEditorStore } from "@/lib/store";

const JOYSTICK_SIZE = 120;
const KNOB_SIZE = 48;
const MAX_DIST = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

export function TouchControls() {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const health = useEditorStore((s) => s.health);
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef<{ x: number; y: number } | null>(null);
  const lookTouchRef = useRef<{ x: number; y: number } | null>(null);

  const isGameOver = health <= 0;

  const resetJoystick = useCallback(() => {
    joystickTouchId.current = null;
    joystickCenter.current = null;
    touchMoveState.forward = 0;
    touchMoveState.right = 0;
    touchMoveState.sprint = false;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(-50%, -50%)";
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || isGameOver) {
      resetJoystick();
      return;
    }

    const zone = joystickRef.current;
    if (!zone) return;

    const handleStart = (e: TouchEvent) => {
      if (joystickTouchId.current !== null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]!;
        const rect = zone.getBoundingClientRect();
        if (
          t.clientX >= rect.left &&
          t.clientX <= rect.right &&
          t.clientY >= rect.top &&
          t.clientY <= rect.bottom
        ) {
          joystickTouchId.current = t.identifier;
          joystickCenter.current = { x: t.clientX, y: t.clientY };
          break;
        }
      }
    };

    const handleMove = (e: TouchEvent) => {
      if (joystickTouchId.current === null || !joystickCenter.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]!;
        if (t.identifier !== joystickTouchId.current) continue;

        let dx = t.clientX - joystickCenter.current.x;
        let dy = t.clientY - joystickCenter.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, MAX_DIST);
        if (dist > 0) {
          dx = (dx / dist) * clamped;
          dy = (dy / dist) * clamped;
        }

        const normalized = dist > 0 ? Math.min(dist / MAX_DIST, 1) : 0;
        touchMoveState.right = (dx / MAX_DIST) * normalized;
        touchMoveState.forward = -(dy / MAX_DIST) * normalized;

        if (knobRef.current) {
          knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
        break;
      }
    };

    const handleEnd = (e: TouchEvent) => {
      if (joystickTouchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i]!.identifier === joystickTouchId.current) {
          resetJoystick();
          break;
        }
      }
    };

    zone.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd, { passive: true });
    window.addEventListener("touchcancel", handleEnd, { passive: true });

    return () => {
      zone.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
      resetJoystick();
    };
  }, [isPlaying, isGameOver, resetJoystick]);

  const handleLookStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      lookTouchRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleLookMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !lookTouchRef.current) return;
    touchMoveState.lookDeltaX +=
      (touch.clientX - lookTouchRef.current.x) * 0.004;
    touchMoveState.lookDeltaY +=
      (touch.clientY - lookTouchRef.current.y) * 0.004;
    lookTouchRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleLookEnd = useCallback(() => {
    lookTouchRef.current = null;
  }, []);

  const handleJump = useCallback(() => {
    touchMoveState.jump = true;
    setTimeout(() => {
      touchMoveState.jump = false;
    }, 150);
  }, []);

  if (!isPlaying || isGameOver) return null;

  return (
    <>
      {/* Joystick zone (left half, bottom) */}
      <div
        ref={joystickRef}
        className="fixed left-0 bottom-0 z-20 pointer-events-auto"
        style={{ width: "45vw", height: "40vh" }}
      >
        {/* Joystick base */}
        <div
          className="absolute rounded-full border border-white/20 bg-white/5"
          style={{
            width: JOYSTICK_SIZE,
            height: JOYSTICK_SIZE,
            left: 60 - JOYSTICK_SIZE / 2,
            bottom: 60 - JOYSTICK_SIZE / 2,
          }}
        >
          {/* Knob */}
          <div
            ref={knobRef}
            className="absolute left-1/2 top-1/2 rounded-full bg-white/25 border border-white/30"
            style={{
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>

      {/* Look zone (right half) */}
      <div
        className="fixed right-0 top-10 bottom-0 z-20 pointer-events-auto"
        style={{ width: "55vw" }}
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Jump button */}
      <button
        onTouchStart={handleJump}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center active:bg-white/30 pointer-events-auto"
      >
        <ArrowUp size={24} className="text-white/70" />
      </button>
    </>
  );
}

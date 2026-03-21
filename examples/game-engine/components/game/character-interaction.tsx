"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEditorStore } from "@/lib/store";

export function CharacterInteraction() {
  const [nearbyCharacter, setNearbyCharacter] = useState<{
    id: string;
    role: string;
  } | null>(null);
  const { camera } = useThree();
  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);
  const isPlaying = useEditorStore((s) => s.isPlaying);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const objects = useMemo(
    () => (activeScene ? activeScene.objects : []),
    [activeScene],
  );

  useEffect(() => {
    if (!isPlaying) {
      setNearbyCharacter(null);
      return;
    }

    const checkProximity = () => {
      if (!camera) return;

      const cameraPos = new THREE.Vector3();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
      camera.getWorldPosition(cameraPos as any);

      const characters = objects.filter(
        (obj) => obj.type === "character" && obj.visible,
      );

      let closest: { id: string; role: string } | null = null;
      let closestDist = Infinity;

      for (const character of characters) {
        const charPos = new THREE.Vector3(...character.position);
        const dist = cameraPos.distanceTo(charPos);

        if (dist < 3 && dist < closestDist) {
          closestDist = dist;
          closest = {
            id: character.id,
            role: character.character?.role || "villager",
          };
        }
      }

      if (closest) {
        if (!nearbyCharacter || nearbyCharacter.id !== closest.id) {
          setNearbyCharacter(closest);
          window.dispatchEvent(
            new CustomEvent("character-nearby", {
              detail: { id: closest.id, role: closest.role },
            }),
          );
        }
      } else if (nearbyCharacter) {
        setNearbyCharacter(null);
        window.dispatchEvent(new CustomEvent("character-far"));
      }
    };

    const intervalId = setInterval(checkProximity, 200);

    const triggerInteract = () => {
      if (nearbyCharacter) {
        window.dispatchEvent(
          new CustomEvent("character-interact", {
            detail: {
              id: nearbyCharacter.id,
              role: nearbyCharacter.role,
            },
          }),
        );
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        triggerInteract();
      }
    };

    const handleRequestInteract = () => {
      triggerInteract();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(
      "request-character-interact",
      handleRequestInteract,
    );

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(
        "request-character-interact",
        handleRequestInteract,
      );
    };
  }, [camera, isPlaying, nearbyCharacter, objects]);

  return null;
}

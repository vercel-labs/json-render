"use client";

import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEditorStore } from "@/lib/store";

interface SoundEmitterProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  url: string;
  loop?: boolean | null;
  volume?: number | null;
  positional?: boolean | null;
  distance?: number | null;
  objectId?: string | null;
}

export function SoundEmitter({
  position,
  url,
  loop,
  volume,
  positional,
  distance,
}: SoundEmitterProps) {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const { camera } = useThree();
  const listenerRef = useRef<THREE.AudioListener | null>(null);
  const soundRef = useRef<THREE.PositionalAudio | THREE.Audio | null>(null);
  const pos: [number, number, number] = position ?? [0, 0, 0];

  useEffect(() => {
    if (!isPlaying || !url) return;

    const listener = new THREE.AudioListener();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    camera.add(listener as any);
    listenerRef.current = listener;

    const loader = new THREE.AudioLoader();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let audio: any;

    if (positional !== false) {
      audio = new THREE.PositionalAudio(listener);
      audio.setRefDistance(distance ?? 10);
    } else {
      audio = new THREE.Audio(listener);
    }

    loader.load(url, (buffer) => {
      audio.setBuffer(buffer);
      audio.setLoop(loop ?? false);
      audio.setVolume(volume ?? 1);
      audio.play();
    });

    soundRef.current = audio;

    return () => {
      if (soundRef.current?.isPlaying) soundRef.current.stop();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      camera.remove(listener as any);
    };
  }, [isPlaying, url, loop, volume, positional, distance, camera]);

  // Edit mode indicator
  if (!isPlaying) {
    return (
      <mesh position={pos}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#9b59b6" wireframe />
      </mesh>
    );
  }

  return <group position={pos} />;
}

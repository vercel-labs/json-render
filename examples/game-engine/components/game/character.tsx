"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useEditorStore } from "@/lib/store";

interface GameCharacterProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  castShadow?: boolean | null;
  receiveShadow?: boolean | null;
  modelUrl: string;
  role?: string | null;
  physics?: {
    mass?: number | null;
    isStatic?: boolean | null;
    restitution?: number | null;
    friction?: number | null;
    colliderType?: string | null;
  } | null;
  objectId?: string | null;
}

export function GameCharacter({
  position,
  rotation,
  scale,
  modelUrl,
}: GameCharacterProps) {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [isNear, setIsNear] = useState(false);

  useFrame(() => {
    if (!isPlaying || !groupRef.current) return;
    const dist = groupRef.current.position.distanceTo(camera.position);
    setIsNear(dist < 3);
  });

  if (!modelUrl) {
    return (
      <group position={pos} rotation={rot} scale={scl} ref={groupRef}>
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
          <meshStandardMaterial color="#e74c3c" />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={pos} rotation={rot} scale={scl}>
      <CharacterModel url={modelUrl} />
      {isPlaying && isNear && (
        <sprite position={[0, 2.2, 0]} scale={[0.5, 0.5, 0.5]}>
          <spriteMaterial color="#ffffff" opacity={0.8} transparent />
        </sprite>
      )}
    </group>
  );
}

function CharacterModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} />;
}

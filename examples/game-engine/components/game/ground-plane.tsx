"use client";

import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useEditorStore } from "@/lib/store";

interface GroundPlaneProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  material?: {
    color?: string | null;
    metalness?: number | null;
    roughness?: number | null;
  } | null;
  size?: number | null;
}

export function GroundPlane({ position, material, size }: GroundPlaneProps) {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const s = size ?? 5000;
  const pos: [number, number, number] = position ?? [0, -0.1, 0];

  const plane = (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos} receiveShadow>
      <planeGeometry args={[s, s]} />
      <meshStandardMaterial
        color={material?.color ?? "#4CAF50"}
        metalness={material?.metalness ?? 0}
        roughness={material?.roughness ?? 0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );

  if (!isPlaying) return plane;

  return (
    <RigidBody type="fixed" position={pos} colliders={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[s, s]} />
        <meshStandardMaterial
          color={material?.color ?? "#4CAF50"}
          metalness={material?.metalness ?? 0}
          roughness={material?.roughness ?? 0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <CuboidCollider args={[s / 2, 0.01, s / 2]} position={[0, 0, 0]} />
    </RigidBody>
  );
}

"use client";

import { useRef, useEffect, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import {
  RigidBody,
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
} from "@react-three/rapier";
import type * as THREE from "three";
import { useEditorStore } from "@/lib/store";

interface PhysicsProps {
  mass?: number | null;
  isStatic?: boolean | null;
  restitution?: number | null;
  friction?: number | null;
  colliderType?: string | null;
}

interface DamageProps {
  amount?: number | null;
  enabled?: boolean | null;
}

interface GameModelProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  castShadow?: boolean | null;
  receiveShadow?: boolean | null;
  url: string;
  physics?: PhysicsProps | null;
  damage?: DamageProps | null;
  objectId?: string | null;
}

function ModelInner({
  url,
  userData,
}: {
  url: string;
  userData: Record<string, unknown>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const setIsLoading = useEditorStore((s) => s.setIsLoading);

  const model = scene.clone();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
    model.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }, [model]);

  useEffect(() => {
    if (groupRef.current) {
      Object.assign(groupRef.current.userData, userData);
    }
  }, [userData]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [setIsLoading]);

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}

export function GameModel({
  position,
  rotation,
  scale,
  url,
  physics,
  damage,
  objectId,
}: GameModelProps) {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const takeDamage = useEditorStore((s) => s.takeDamage);
  const setIsLoading = useEditorStore((s) => s.setIsLoading);

  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  const hasPhysics =
    isPlaying &&
    physics &&
    physics.colliderType &&
    physics.colliderType !== "none";
  const hasDamage = damage?.enabled && (damage.amount ?? 0) > 0;

  useEffect(() => {
    if (url) setIsLoading(true);
  }, [url, setIsLoading]);

  if (!url) {
    return (
      <group position={pos} rotation={rot} scale={scl}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#888888" wireframe />
        </mesh>
      </group>
    );
  }

  const inner = (
    <Suspense fallback={null}>
      <ModelInner url={url} userData={{ id: objectId, objectId }} />
    </Suspense>
  );

  if (!hasPhysics) {
    return (
      <group position={pos} rotation={rot} scale={scl}>
        {inner}
      </group>
    );
  }

  const collider =
    physics!.colliderType === "ball" ? (
      <BallCollider args={[Math.max(scl[0], scl[1], scl[2]) * 0.5]} />
    ) : physics!.colliderType === "capsule" ? (
      <CapsuleCollider args={[scl[1] * 0.25, Math.max(scl[0], scl[2]) * 0.5]} />
    ) : (
      <CuboidCollider args={[scl[0] * 0.5, scl[1] * 0.5, scl[2] * 0.5]} />
    );

  return (
    <RigidBody
      type={physics!.isStatic ? "fixed" : "dynamic"}
      position={pos}
      rotation={rot}
      mass={physics!.mass ?? 1}
      restitution={physics!.restitution ?? 0.2}
      friction={physics!.friction ?? 0.5}
      colliders={false}
      onCollisionEnter={
        hasDamage ? () => takeDamage(damage!.amount!) : undefined
      }
    >
      <group scale={scl}>{inner}</group>
      {collider}
    </RigidBody>
  );
}

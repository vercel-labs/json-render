"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, useGLTF } from "@react-three/drei";
import { RigidBody, CapsuleCollider, useRapier } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";
import { touchMoveState } from "@/lib/touch-state";
import { resetBoneScales } from "@/lib/bone-utils";

interface PlayerProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  objectId?: string | null;
  isPlayer?: boolean | null;
}

export function Player({ position }: PlayerProps) {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const viewMode = useEditorStore((s) => s.viewMode);
  const health = useEditorStore((s) => s.health);
  const isPromptOpen = useEditorStore((s) => s.isPromptOpen);

  if (!isPlaying) {
    const pos = position ?? [0, 0, 0];
    return (
      <mesh position={pos as [number, number, number]}>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial color="#3498db" transparent opacity={0.5} />
      </mesh>
    );
  }

  if (viewMode === "first-person") {
    return (
      <FirstPersonController
        initialPosition={position ?? [0, 0, 0]}
        health={health}
        isPromptOpen={isPromptOpen}
      />
    );
  }

  return (
    <ThirdPersonController
      initialPosition={position ?? [0, 0, 0]}
      health={health}
      isPromptOpen={isPromptOpen}
    />
  );
}

function FirstPersonController({
  initialPosition,
  health,
  isPromptOpen,
}: {
  initialPosition: [number, number, number];
  health: number;
  isPromptOpen: boolean;
}) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const playerRef = useRef<RapierRigidBody>(null);
  const isMobile = useIsMobile();

  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  });

  const { rapier, world } = useRapier();
  const playerDirection = useRef(new THREE.Vector3());
  const isOnGround = useRef(true);
  const jumpCooldown = useRef(0);
  const touchYaw = useRef(0);
  const touchPitch = useRef(0);

  const speed = 5;
  const jumpForce = 5;
  const groundCastDist = 0.85;
  const isGameOver = health <= 0;

  useEffect(() => {
    if (isMobile) {
      camera.rotation.order = "YXZ";
      camera.rotation.set(0, 0, 0);
      touchYaw.current = 0;
      touchPitch.current = 0;
    }
  }, [isMobile, camera]);

  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPromptOpen || isGameOver) return;
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.right = true;
          break;
        case "Space":
          moveState.current.jump = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          moveState.current.sprint = true;
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.right = false;
          break;
        case "Space":
          moveState.current.jump = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          moveState.current.sprint = false;
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPromptOpen, isGameOver, isMobile]);

  useFrame((_, delta) => {
    if (!playerRef.current || isGameOver) return;

    const body = playerRef.current;
    const vel = body.linvel();

    let forward: boolean;
    let backward: boolean;
    let left: boolean;
    let right: boolean;
    let jump: boolean;
    let sprint: boolean;

    if (isMobile) {
      forward = touchMoveState.forward > 0.15;
      backward = touchMoveState.forward < -0.15;
      left = touchMoveState.right < -0.15;
      right = touchMoveState.right > 0.15;
      jump = touchMoveState.jump;
      sprint = touchMoveState.sprint;

      if (touchMoveState.lookDeltaX !== 0 || touchMoveState.lookDeltaY !== 0) {
        touchYaw.current -= touchMoveState.lookDeltaX;
        touchPitch.current -= touchMoveState.lookDeltaY;
        touchPitch.current = Math.max(
          -Math.PI / 2 + 0.01,
          Math.min(Math.PI / 2 - 0.01, touchPitch.current),
        );
        camera.rotation.order = "YXZ";
        camera.rotation.y = touchYaw.current;
        camera.rotation.x = touchPitch.current;
        touchMoveState.lookDeltaX = 0;
        touchMoveState.lookDeltaY = 0;
      }
    } else {
      ({ forward, backward, left, right, jump, sprint } = moveState.current);
    }

    playerDirection.current.set(0, 0, 0);

    const frontVector = new THREE.Vector3(
      0,
      0,
      (backward ? 1 : 0) - (forward ? 1 : 0),
    );
    const sideVector = new THREE.Vector3(
      (right ? 1 : 0) - (left ? 1 : 0),
      0,
      0,
    );
    playerDirection.current
      .addVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed * (sprint ? 1.8 : 1))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
      .applyEuler(camera.rotation as any);

    body.setLinvel(
      { x: playerDirection.current.x, y: vel.y, z: playerDirection.current.z },
      true,
    );

    if (jump && isOnGround.current && jumpCooldown.current <= 0) {
      body.setLinvel({ x: vel.x, y: jumpForce, z: vel.z }, true);
      isOnGround.current = false;
      jumpCooldown.current = 0.3;
    }

    if (jumpCooldown.current > 0) jumpCooldown.current -= delta;

    const pos = body.translation();
    const ray = new rapier.Ray(
      { x: pos.x, y: pos.y, z: pos.z },
      { x: 0, y: -1, z: 0 },
    );
    const hit = world.castRay(ray, groundCastDist, false);
    isOnGround.current = hit !== null;

    camera.position.set(pos.x, pos.y + 0.85, pos.z);
  });

  return (
    <>
      {!isMobile && <PointerLockControls ref={controlsRef} />}
      <RigidBody
        ref={playerRef}
        position={[
          initialPosition[0],
          initialPosition[1] + 2,
          initialPosition[2],
        ]}
        enabledRotations={[false, false, false]}
        mass={1}
        linearDamping={0.5}
        type="dynamic"
        colliders={false}
        lockRotations
      >
        <CapsuleCollider args={[0.35, 0.3]} />
      </RigidBody>
    </>
  );
}

function AnimatedCharacterModelInner({
  characterRef,
  isMoving,
}: {
  characterRef: React.RefObject<THREE.Group | null>;
  isMoving: boolean;
}) {
  const characterGltf = useGLTF("/models/bot.glb");
  const walkGltf = useGLTF("/models/walking.glb");
  const idleGltf = useGLTF("/models/idle.glb");

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!characterRef.current || !characterGltf || !walkGltf || !idleGltf)
      return;

    try {
      characterGltf.scene.scale.set(1, 1, 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
      resetBoneScales(characterGltf.scene as any);

      characterRef.current.clear();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch between drei and three
      characterRef.current.add(characterGltf.scene.clone() as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
      const mixer = new THREE.AnimationMixer(characterRef.current as any);
      mixerRef.current = mixer;

      if (idleGltf.animations[0] && walkGltf.animations[0]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
        const idleAction = mixer.clipAction(idleGltf.animations[0] as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
        const walkAction = mixer.clipAction(walkGltf.animations[0] as any);
        actionsRef.current = { idle: idleAction, walk: walkAction };
        idleAction.play();
        setReady(true);
      }
    } catch {
      // Model loading failed
    }
  }, [characterRef, characterGltf, walkGltf, idleGltf]);

  useEffect(() => {
    if (!ready) return;
    const { idle, walk } = actionsRef.current;
    if (!idle || !walk) return;

    if (isMoving) {
      idle.fadeOut(0.2);
      walk.reset().fadeIn(0.2).play();
    } else {
      walk.fadeOut(0.2);
      idle.reset().fadeIn(0.2).play();
    }
  }, [isMoving, ready]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return null;
}

function ThirdPersonController({
  initialPosition,
  health,
  isPromptOpen,
}: {
  initialPosition: [number, number, number];
  health: number;
  isPromptOpen: boolean;
}) {
  const { camera } = useThree();
  const playerRef = useRef<RapierRigidBody>(null);
  const characterRef = useRef<THREE.Group>(null);
  const cameraAngle = useRef(0);
  const [isMoving, setIsMoving] = useState(false);
  const isMobile = useIsMobile();

  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  const speed = 5;
  const isGameOver = health <= 0;

  useEffect(() => {
    if (isMobile) {
      cameraAngle.current = 0;
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPromptOpen || isGameOver) return;
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.right = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          moveState.current.sprint = true;
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.right = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          moveState.current.sprint = false;
          break;
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      cameraAngle.current -= e.movementX * 0.003;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isPromptOpen, isGameOver, isMobile]);

  useFrame(() => {
    if (!playerRef.current || isGameOver) return;

    const body = playerRef.current;
    const vel = body.linvel();

    let forward: boolean;
    let backward: boolean;
    let left: boolean;
    let right: boolean;
    let sprint: boolean;

    if (isMobile) {
      forward = touchMoveState.forward > 0.15;
      backward = touchMoveState.forward < -0.15;
      left = touchMoveState.right < -0.15;
      right = touchMoveState.right > 0.15;
      sprint = touchMoveState.sprint;

      if (touchMoveState.lookDeltaX !== 0) {
        cameraAngle.current -= touchMoveState.lookDeltaX;
        touchMoveState.lookDeltaX = 0;
        touchMoveState.lookDeltaY = 0;
      }
    } else {
      ({ forward, backward, left, right, sprint } = moveState.current);
    }

    const dir = new THREE.Vector3(0, 0, 0);
    if (forward) dir.z -= 1;
    if (backward) dir.z += 1;
    if (left) dir.x -= 1;
    if (right) dir.x += 1;
    dir.normalize().multiplyScalar(speed * (sprint ? 1.8 : 1));
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle.current);

    body.setLinvel({ x: dir.x, y: vel.y, z: dir.z }, true);

    const moving = dir.length() > 0.1;
    setIsMoving(moving);

    const pos = body.translation();

    if (characterRef.current) {
      characterRef.current.position.set(pos.x, pos.y, pos.z);
      if (moving) {
        const targetAngle = Math.atan2(dir.x, dir.z);
        characterRef.current.rotation.y = targetAngle;
      }
    }

    const camDist = 6;
    const camHeight = 3;
    camera.position.set(
      pos.x + Math.sin(cameraAngle.current) * camDist,
      pos.y + camHeight,
      pos.z + Math.cos(cameraAngle.current) * camDist,
    );
    camera.lookAt(pos.x, pos.y + 1, pos.z);
  });

  return (
    <>
      <RigidBody
        ref={playerRef}
        position={[
          initialPosition[0],
          initialPosition[1] + 2,
          initialPosition[2],
        ]}
        enabledRotations={[false, false, false]}
        mass={1}
        linearDamping={0.5}
        type="dynamic"
        colliders={false}
        lockRotations
      >
        <CapsuleCollider args={[0.35, 0.3]} />
      </RigidBody>
      <group ref={characterRef} position={initialPosition}>
        <Suspense fallback={null}>
          <AnimatedCharacterModelInner
            characterRef={characterRef}
            isMoving={isMoving}
          />
        </Suspense>
        {/* Fallback capsule mesh visible until models load */}
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
          <meshStandardMaterial color="#3498db" />
        </mesh>
      </group>
    </>
  );
}

"use client";

import { useRef, useEffect, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEditorStore } from "@/lib/store";

export function EditorControls() {
  const isPlaying = useEditorStore((s) => s.isPlaying);

  if (isPlaying) return null;

  return (
    <>
      <EditorOrbitControls />
      <TransformGizmo />
    </>
  );
}

function EditorOrbitControls() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);

  useEffect(() => {
    const enable = () => {
      if (orbitRef.current) orbitRef.current.enabled = false;
    };
    const disable = () => {
      if (orbitRef.current) orbitRef.current.enabled = true;
    };

    window.addEventListener("transform-start", enable);
    window.addEventListener("transform-end", disable);
    return () => {
      window.removeEventListener("transform-start", enable);
      window.removeEventListener("transform-end", disable);
    };
  }, []);

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={1}
      maxDistance={200}
    />
  );
}

function TransformGizmo() {
  const {
    selectedObjectId,
    transformMode,
    isPlaying,
    updateObjectTransform,
    saveToHistory,
  } = useEditorStore();
  const { scene } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  const findObjectById = useCallback(
    (id: string): THREE.Object3D | null => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let found: any = null;
      scene.traverse((child) => {
        if (child.userData?.id === id || child.userData?.objectId === id) {
          found = child;
        }
      });
      return found;
    },
    [scene],
  );

  useEffect(() => {
    if (
      !controlsRef.current ||
      !selectedObjectId ||
      isPlaying ||
      transformMode === "select"
    ) {
      if (controlsRef.current) {
        try {
          controlsRef.current.detach();
        } catch {
          /* may not be attached */
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      const obj = findObjectById(selectedObjectId);
      if (obj && controlsRef.current) {
        try {
          controlsRef.current.attach(obj);
        } catch {
          /* object may not be ready */
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [selectedObjectId, transformMode, isPlaying, findObjectById]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onDragStart = () =>
      window.dispatchEvent(new CustomEvent("transform-start"));
    const onDragEnd = () =>
      window.dispatchEvent(new CustomEvent("transform-end"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    controls.addEventListener("dragging-changed", (e: any) => {
      if (e.value) onDragStart();
      else onDragEnd();
    });

    return () => {
      controls.removeEventListener("dragging-changed", onDragStart);
    };
  }, []);

  const handleChange = useCallback(() => {
    if (!controlsRef.current || !selectedObjectId) return;
    const obj = controlsRef.current.object;
    if (!obj) return;

    updateObjectTransform(selectedObjectId, {
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    });
  }, [selectedObjectId, updateObjectTransform]);

  const handleMouseUp = useCallback(() => {
    saveToHistory();
  }, [saveToHistory]);

  if (!selectedObjectId || isPlaying || transformMode === "select") return null;

  const mode =
    transformMode === "translate"
      ? "translate"
      : transformMode === "rotate"
        ? "rotate"
        : "scale";

  return (
    <TransformControls
      ref={controlsRef}
      mode={mode}
      onObjectChange={handleChange}
      onMouseUp={handleMouseUp}
    />
  );
}

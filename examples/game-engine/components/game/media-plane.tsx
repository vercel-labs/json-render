"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

interface MediaPlaneProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  castShadow?: boolean | null;
  receiveShadow?: boolean | null;
  url: string;
  mediaType: "image" | "video";
  loop?: boolean | null;
  autoplay?: boolean | null;
  muted?: boolean | null;
  width?: number | null;
  height?: number | null;
  objectId?: string | null;
}

export function MediaPlane({
  position,
  rotation,
  scale,
  url,
  mediaType,
  loop,
  autoplay,
  muted,
  width,
  height,
}: MediaPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) return;

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.loop = loop ?? false;
      video.muted = muted ?? true;
      if (autoplay !== false) video.play();

      const tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);

      return () => {
        video.pause();
        video.src = "";
        tex.dispose();
      };
    } else {
      const loader = new THREE.TextureLoader();
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      });
    }
  }, [url, mediaType, loop, autoplay, muted]);

  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];
  const w = width ?? 2;
  const h = height ?? w * 0.75;

  return (
    <mesh
      ref={meshRef}
      position={pos}
      rotation={rot}
      scale={scl}
      castShadow
      receiveShadow
    >
      <planeGeometry args={[w, h]} />
      {texture ? (
        <meshBasicMaterial
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
          map={texture as any}
          side={THREE.DoubleSide}
        />
      ) : (
        <meshStandardMaterial color="#333" side={THREE.DoubleSide} />
      )}
    </mesh>
  );
}

"use client";

interface GameLightProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  lightType: "ambient" | "directional" | "point" | "spot";
  color?: string | null;
  intensity?: number | null;
  distance?: number | null;
  decay?: number | null;
  angle?: number | null;
  penumbra?: number | null;
  castShadow?: boolean | null;
  objectId?: string | null;
}

export function GameLight({
  position,
  lightType,
  color,
  intensity,
  distance,
  decay,
  angle,
  penumbra,
  castShadow,
}: GameLightProps) {
  const c = color ?? "#ffffff";
  const i = intensity ?? 1;

  switch (lightType) {
    case "ambient":
      return <ambientLight color={c} intensity={i} />;
    case "directional":
      return (
        <directionalLight
          position={position ?? [5, 10, 5]}
          color={c}
          intensity={i}
          castShadow={castShadow ?? true}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
      );
    case "spot":
      return (
        <spotLight
          position={position ?? [0, 5, 0]}
          color={c}
          intensity={i}
          distance={distance ?? 0}
          decay={decay ?? 2}
          angle={angle ?? Math.PI / 3}
          penumbra={penumbra ?? 0}
          castShadow={castShadow ?? true}
        />
      );
    case "point":
    default:
      return (
        <pointLight
          position={position ?? [0, 3, 0]}
          color={c}
          intensity={i}
          distance={distance ?? 0}
          decay={decay ?? 2}
          castShadow={castShadow ?? false}
        />
      );
  }
}

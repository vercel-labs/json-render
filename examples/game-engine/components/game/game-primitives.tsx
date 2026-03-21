"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
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

interface MaterialProps {
  color?: string | null;
  metalness?: number | null;
  roughness?: number | null;
  emissive?: string | null;
  emissiveIntensity?: number | null;
  opacity?: number | null;
  transparent?: boolean | null;
  wireframe?: boolean | null;
}

interface GamePrimitiveProps {
  position?: [number, number, number] | null;
  rotation?: [number, number, number] | null;
  scale?: [number, number, number] | null;
  castShadow?: boolean | null;
  receiveShadow?: boolean | null;
  material?: MaterialProps | null;
  physics?: PhysicsProps | null;
  damage?: DamageProps | null;
  objectId?: string | null;
  children?: React.ReactNode;
}

function buildMaterialProps(mat?: MaterialProps | null) {
  if (!mat) return { color: "#888888" };
  return {
    color: mat.color ?? "#888888",
    metalness: mat.metalness ?? 0,
    roughness: mat.roughness ?? 0.5,
    ...(mat.emissive ? { emissive: mat.emissive } : {}),
    ...(mat.emissiveIntensity
      ? { emissiveIntensity: mat.emissiveIntensity }
      : {}),
    ...(mat.opacity != null ? { opacity: mat.opacity, transparent: true } : {}),
    ...(mat.wireframe ? { wireframe: true } : {}),
  };
}

function PhysicsWrapper({
  physics,
  damage,
  position,
  rotation,
  scale,
  children,
}: {
  physics?: PhysicsProps | null;
  damage?: DamageProps | null;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  children: React.ReactNode;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const takeDamage = useEditorStore((s) => s.takeDamage);
  const isPlaying = useEditorStore((s) => s.isPlaying);

  const hasPhysics =
    physics && physics.colliderType && physics.colliderType !== "none";
  const hasDamage = damage?.enabled && (damage.amount ?? 0) > 0;

  if (!hasPhysics || !isPlaying) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        {children}
      </group>
    );
  }

  return (
    <RigidBody
      ref={bodyRef}
      type={physics.isStatic ? "fixed" : "dynamic"}
      position={position}
      rotation={rotation}
      mass={physics.mass ?? 1}
      restitution={physics.restitution ?? 0.2}
      friction={physics.friction ?? 0.5}
      onCollisionEnter={
        hasDamage
          ? () => {
              takeDamage(damage!.amount!);
            }
          : undefined
      }
    >
      <group scale={scale}>{children}</group>
    </RigidBody>
  );
}

export function GameBox({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  width,
  height,
  depth,
}: GamePrimitiveProps & {
  width?: number | null;
  height?: number | null;
  depth?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <boxGeometry args={[width ?? 1, height ?? 1, depth ?? 1]} />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameSphere({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  radius,
  widthSegments,
  heightSegments,
}: GamePrimitiveProps & {
  radius?: number | null;
  widthSegments?: number | null;
  heightSegments?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <sphereGeometry
          args={[radius ?? 1, widthSegments ?? 32, heightSegments ?? 16]}
        />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameCylinder({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  radiusTop,
  radiusBottom,
  height,
  radialSegments,
}: GamePrimitiveProps & {
  radiusTop?: number | null;
  radiusBottom?: number | null;
  height?: number | null;
  radialSegments?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <cylinderGeometry
          args={[
            radiusTop ?? 1,
            radiusBottom ?? 1,
            height ?? 1,
            radialSegments ?? 32,
          ]}
        />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameCone({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  radius,
  height,
  radialSegments,
}: GamePrimitiveProps & {
  radius?: number | null;
  height?: number | null;
  radialSegments?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <coneGeometry args={[radius ?? 1, height ?? 1, radialSegments ?? 32]} />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameTorus({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  radius,
  tube,
  radialSegments,
  tubularSegments,
}: GamePrimitiveProps & {
  radius?: number | null;
  tube?: number | null;
  radialSegments?: number | null;
  tubularSegments?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <torusGeometry
          args={[
            radius ?? 1,
            tube ?? 0.4,
            radialSegments ?? 16,
            tubularSegments ?? 48,
          ]}
        />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GamePlane({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  width,
  height,
}: GamePrimitiveProps & { width?: number | null; height?: number | null }) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? true}
      >
        <planeGeometry args={[width ?? 1, height ?? 1]} />
        <meshStandardMaterial
          {...buildMaterialProps(material)}
          side={THREE.DoubleSide}
        />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameCapsule({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  radius,
  length,
}: GamePrimitiveProps & {
  radius?: number | null;
  length?: number | null;
  capSegments?: number | null;
  radialSegments?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <capsuleGeometry args={[radius ?? 0.5, length ?? 1, 16, 32]} />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameKnot({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  radius,
  tube,
  tubularSegments,
  radialSegments,
  p,
  q,
}: GamePrimitiveProps & {
  radius?: number | null;
  tube?: number | null;
  tubularSegments?: number | null;
  radialSegments?: number | null;
  p?: number | null;
  q?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <torusKnotGeometry
          args={[
            radius ?? 1,
            tube ?? 0.3,
            tubularSegments ?? 64,
            radialSegments ?? 8,
            p ?? 2,
            q ?? 3,
          ]}
        />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

function PolyhedronPrimitive({
  Geometry,
  ...props
}: GamePrimitiveProps & {
  Geometry: "tetrahedron" | "octahedron" | "dodecahedron" | "icosahedron";
  radius?: number | null;
}) {
  const pos: [number, number, number] = props.position ?? [0, 0, 0];
  const rot: [number, number, number] = props.rotation ?? [0, 0, 0];
  const scl: [number, number, number] = props.scale ?? [1, 1, 1];
  const r = props.radius ?? 1;

  const geoElement = {
    tetrahedron: <tetrahedronGeometry args={[r]} />,
    octahedron: <octahedronGeometry args={[r]} />,
    dodecahedron: <dodecahedronGeometry args={[r]} />,
    icosahedron: <icosahedronGeometry args={[r]} />,
  }[Geometry];

  return (
    <PhysicsWrapper
      physics={props.physics}
      damage={props.damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={props.castShadow ?? false}
        receiveShadow={props.receiveShadow ?? false}
      >
        {geoElement}
        <meshStandardMaterial {...buildMaterialProps(props.material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameTetrahedron(
  props: GamePrimitiveProps & { radius?: number | null },
) {
  return <PolyhedronPrimitive {...props} Geometry="tetrahedron" />;
}

export function GameOctahedron(
  props: GamePrimitiveProps & { radius?: number | null },
) {
  return <PolyhedronPrimitive {...props} Geometry="octahedron" />;
}

export function GameDodecahedron(
  props: GamePrimitiveProps & { radius?: number | null },
) {
  return <PolyhedronPrimitive {...props} Geometry="dodecahedron" />;
}

export function GameIcosahedron(
  props: GamePrimitiveProps & { radius?: number | null },
) {
  return <PolyhedronPrimitive {...props} Geometry="icosahedron" />;
}

export function GameExtrude({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  shapeData,
  depth,
}: GamePrimitiveProps & {
  shapeData?: {
    points: [number, number][];
    holes?: [number, number][][];
  } | null;
  depth?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  const shape = new THREE.Shape();
  const pts = shapeData?.points ?? [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ];
  if (pts.length > 0) {
    shape.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i]![0], pts[i]![1]);
    }
    shape.closePath();
  }
  if (shapeData?.holes) {
    for (const hole of shapeData.holes) {
      const holePath = new THREE.Path();
      if (hole.length > 0) {
        holePath.moveTo(hole[0]![0], hole[0]![1]);
        for (let i = 1; i < hole.length; i++) {
          holePath.lineTo(hole[i]![0], hole[i]![1]);
        }
        holePath.closePath();
        shape.holes.push(holePath);
      }
    }
  }

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <extrudeGeometry
          args={[
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
            shape as any,
            { depth: depth ?? 1, bevelEnabled: false },
          ]}
        />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameTube({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  radius,
  tubularSegments,
  radialSegments,
}: GamePrimitiveProps & {
  radius?: number | null;
  tubularSegments?: number | null;
  radialSegments?: number | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(-0.5, 0.5, 0),
    new THREE.Vector3(0.5, -0.5, 0),
    new THREE.Vector3(1, 0, 0),
  ]);

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <tubeGeometry
          args={[
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch
            curve as any,
            tubularSegments ?? 64,
            radius ?? 0.1,
            radialSegments ?? 8,
            false,
          ]}
        />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameShape({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  shapeData,
}: GamePrimitiveProps & {
  shapeData?: {
    points: [number, number][];
    holes?: [number, number][][];
  } | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  const shape = new THREE.Shape();
  const pts = shapeData?.points ?? [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0, 0.5],
  ];
  if (pts.length > 0) {
    shape.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i]![0], pts[i]![1]);
    }
    shape.closePath();
  }
  if (shapeData?.holes) {
    for (const hole of shapeData.holes) {
      const holePath = new THREE.Path();
      if (hole.length > 0) {
        holePath.moveTo(hole[0]![0], hole[0]![1]);
        for (let i = 1; i < hole.length; i++) {
          holePath.lineTo(hole[i]![0], hole[i]![1]);
        }
        holePath.closePath();
        shape.holes.push(holePath);
      }
    }
  }

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch */}
        <shapeGeometry args={[shape as any]} />
        <meshStandardMaterial
          {...buildMaterialProps(material)}
          side={THREE.DoubleSide}
        />
      </mesh>
    </PhysicsWrapper>
  );
}

export function GameMesh({
  position,
  rotation,
  scale,
  castShadow,
  receiveShadow,
  material,
  physics,
  damage,
  meshData,
}: GamePrimitiveProps & {
  meshData?: {
    vertices: number[];
    indices: number[];
    normals?: number[];
    uvs?: number[];
  } | null;
}) {
  const pos: [number, number, number] = position ?? [0, 0, 0];
  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current || !meshData) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(meshData.vertices, 3),
    );
    if (meshData.indices.length > 0) {
      geometry.setIndex(meshData.indices);
    }
    if (meshData.normals) {
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(meshData.normals, 3),
      );
    } else {
      geometry.computeVertexNormals();
    }
    if (meshData.uvs) {
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(meshData.uvs, 2),
      );
    }
    meshRef.current.geometry = geometry;
  }, [meshData]);

  return (
    <PhysicsWrapper
      physics={physics}
      damage={damage}
      position={pos}
      rotation={rot}
      scale={scl}
    >
      <mesh
        ref={meshRef}
        castShadow={castShadow ?? false}
        receiveShadow={receiveShadow ?? false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...buildMaterialProps(material)} />
      </mesh>
    </PhysicsWrapper>
  );
}

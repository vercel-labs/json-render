// @ts-nocheck
import React, { type ReactNode, Suspense, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Environment as DreiEnvironment,
  OrbitControls as DreiOrbitControls,
  PerspectiveCamera as DreiPerspectiveCamera,
  Text as DreiText,
  Gltf,
  Sparkles as DreiSparkles,
  Stars as DreiStars,
  Sky as DreiSky,
  Cloud as DreiCloud,
  Clouds as DreiClouds,
  Float as DreiFloat,
  ContactShadows as DreiContactShadows,
  MeshTransmissionMaterial,
  MeshDistortMaterial,
  MeshReflectorMaterial,
  MeshPortalMaterial as DreiMeshPortalMaterial,
  Html as DreiHtml,
  RoundedBox as DreiRoundedBox,
  Backdrop as DreiBackdrop,
  CameraShake as DreiCameraShake,
} from "@react-three/drei";
// @ts-ignore
import * as postprocessing from "@react-three/postprocessing";
import * as THREE from "three";
import type { BaseComponentProps } from "@json-render/react";
import type { ThreeProps } from "./catalog";

// =============================================================================
// Helpers
// =============================================================================

type Vec3 = [number, number, number];

const DEFAULT_POS: Vec3 = [0, 0, 0];
const DEFAULT_ROT: Vec3 = [0, 0, 0];
const DEFAULT_SCALE: Vec3 = [1, 1, 1];

function pos(v: Vec3 | null | undefined): Vec3 {
  return v ?? DEFAULT_POS;
}

function rot(v: Vec3 | null | undefined): Vec3 {
  return v ?? DEFAULT_ROT;
}

function scl(v: Vec3 | null | undefined): Vec3 {
  return v ?? DEFAULT_SCALE;
}

function MaterialComponent({
  material,
}: {
  material: ThreeProps<"Box">["material"] | null | undefined;
}) {
  if (!material) return <meshStandardMaterial />;
  return (
    <meshStandardMaterial
      color={material.color ?? "#ffffff"}
      metalness={material.metalness ?? 0}
      roughness={material.roughness ?? 1}
      emissive={material.emissive ?? "#000000"}
      emissiveIntensity={material.emissiveIntensity ?? 1}
      opacity={material.opacity ?? 1}
      transparent={material.transparent ?? false}
      wireframe={material.wireframe ?? false}
    />
  );
}

// =============================================================================
// Component Implementations
// =============================================================================

/**
 * React Three Fiber component implementations for json-render.
 *
 * Pass to `defineRegistry()` from `@json-render/react` to create a
 * component registry for rendering JSON specs as 3D scenes.
 *
 * @example
 * ```ts
 * import { defineRegistry } from "@json-render/react";
 * import { threeComponents } from "@json-render/react-three-fiber";
 *
 * const { registry } = defineRegistry(catalog, {
 *   components: { ...threeComponents },
 * });
 * ```
 */
export const threeComponents = {
  // ── Primitives ─────────────────────────────────────────────────────────

  Box: ({ props }: BaseComponentProps<ThreeProps<"Box">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <boxGeometry
        args={[props.width ?? 1, props.height ?? 1, props.depth ?? 1]}
      />
      <MaterialComponent material={props.material} />
    </mesh>
  ),

  Sphere: ({ props }: BaseComponentProps<ThreeProps<"Sphere">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <sphereGeometry
        args={[
          props.radius ?? 1,
          props.widthSegments ?? 32,
          props.heightSegments ?? 16,
        ]}
      />
      <MaterialComponent material={props.material} />
    </mesh>
  ),

  Cylinder: ({ props }: BaseComponentProps<ThreeProps<"Cylinder">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <cylinderGeometry
        args={[
          props.radiusTop ?? 1,
          props.radiusBottom ?? 1,
          props.height ?? 1,
          props.radialSegments ?? 32,
        ]}
      />
      <MaterialComponent material={props.material} />
    </mesh>
  ),

  Cone: ({ props }: BaseComponentProps<ThreeProps<"Cone">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <coneGeometry
        args={[
          props.radius ?? 1,
          props.height ?? 1,
          props.radialSegments ?? 32,
        ]}
      />
      <MaterialComponent material={props.material} />
    </mesh>
  ),

  Torus: ({ props }: BaseComponentProps<ThreeProps<"Torus">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <torusGeometry
        args={[
          props.radius ?? 1,
          props.tube ?? 0.4,
          props.radialSegments ?? 16,
          props.tubularSegments ?? 48,
        ]}
      />
      <MaterialComponent material={props.material} />
    </mesh>
  ),

  Plane: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"Plane">> & { children?: ReactNode }) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <planeGeometry args={[props.width ?? 1, props.height ?? 1]} />
      {children ?? <MaterialComponent material={props.material} />}
    </mesh>
  ),

  Capsule: ({ props }: BaseComponentProps<ThreeProps<"Capsule">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <capsuleGeometry
        args={[
          props.radius ?? 0.5,
          props.length ?? 1,
          props.capSegments ?? 4,
          props.radialSegments ?? 16,
        ]}
      />
      <MaterialComponent material={props.material} />
    </mesh>
  ),

  // ── Lights ─────────────────────────────────────────────────────────────

  AmbientLight: ({ props }: BaseComponentProps<ThreeProps<"AmbientLight">>) => (
    <ambientLight
      color={props.color ?? "#ffffff"}
      intensity={props.intensity ?? 1}
    />
  ),

  DirectionalLight: ({
    props,
  }: BaseComponentProps<ThreeProps<"DirectionalLight">>) => (
    <directionalLight
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      color={props.color ?? "#ffffff"}
      intensity={props.intensity ?? 1}
      castShadow={props.castShadow ?? false}
    />
  ),

  PointLight: ({ props }: BaseComponentProps<ThreeProps<"PointLight">>) => (
    <pointLight
      position={pos(props.position)}
      color={props.color ?? "#ffffff"}
      intensity={props.intensity ?? 1}
      distance={props.distance ?? 0}
      decay={props.decay ?? 2}
      castShadow={props.castShadow ?? false}
    />
  ),

  SpotLight: ({ props }: BaseComponentProps<ThreeProps<"SpotLight">>) => (
    <spotLight
      position={pos(props.position)}
      color={props.color ?? "#ffffff"}
      intensity={props.intensity ?? 1}
      distance={props.distance ?? 0}
      decay={props.decay ?? 2}
      angle={props.angle ?? Math.PI / 3}
      penumbra={props.penumbra ?? 0}
      castShadow={props.castShadow ?? false}
    />
  ),

  // ── Container ──────────────────────────────────────────────────────────

  Group: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"Group">> & { children?: ReactNode }) => (
    <group
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
    >
      {children}
    </group>
  ),

  // ── Model ──────────────────────────────────────────────────────────────

  Model: ({ props }: BaseComponentProps<ThreeProps<"Model">>) => (
    <Suspense fallback={null}>
      <Gltf
        src={props.url}
        position={pos(props.position)}
        rotation={rot(props.rotation)}
        scale={scl(props.scale)}
        castShadow={props.castShadow ?? false}
        receiveShadow={props.receiveShadow ?? false}
      />
    </Suspense>
  ),

  // ── Environment ────────────────────────────────────────────────────────

  Environment: ({ props }: BaseComponentProps<ThreeProps<"Environment">>) => (
    <DreiEnvironment
      preset={props.preset ?? "sunset"}
      background={props.background ?? false}
      blur={props.blur ?? 0}
      environmentIntensity={props.intensity ?? 1}
    />
  ),

  Fog: ({ props }: BaseComponentProps<ThreeProps<"Fog">>) => (
    <fog
      attach="fog"
      args={[props.color ?? "#cccccc", props.near ?? 10, props.far ?? 50]}
    />
  ),

  GridHelper: ({ props }: BaseComponentProps<ThreeProps<"GridHelper">>) => (
    <group
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
    >
      <gridHelper
        args={[
          props.size ?? 10,
          props.divisions ?? 10,
          props.color ?? "#888888",
          props.secondaryColor ?? "#444444",
        ]}
      />
    </group>
  ),

  // ── Text ───────────────────────────────────────────────────────────────

  Text3D: ({ props }: BaseComponentProps<ThreeProps<"Text3D">>) => (
    <DreiText
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      fontSize={props.fontSize ?? 1}
      color={props.color ?? "#ffffff"}
      anchorX={props.anchorX ?? "center"}
      anchorY={props.anchorY ?? "middle"}
      maxWidth={props.maxWidth ?? undefined}
    >
      {props.text}
    </DreiText>
  ),

  // ── Effects / Atmosphere ──────────────────────────────────────────────

  Sparkles: ({ props }: BaseComponentProps<ThreeProps<"Sparkles">>) => (
    <DreiSparkles
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      count={props.count ?? 50}
      speed={props.speed ?? 0.4}
      opacity={props.opacity ?? 1}
      color={props.color ?? "#ffffff"}
      size={props.size ?? 1}
      noise={props.noise ?? 1}
    />
  ),

  Stars: ({ props }: BaseComponentProps<ThreeProps<"Stars">>) => (
    <DreiStars
      radius={props.radius ?? 100}
      depth={props.depth ?? 50}
      count={props.count ?? 5000}
      factor={props.factor ?? 4}
      saturation={props.saturation ?? 0}
      fade={props.fade ?? true}
      speed={props.speed ?? 1}
    />
  ),

  Sky: ({ props }: BaseComponentProps<ThreeProps<"Sky">>) => (
    <DreiSky
      distance={props.distance ?? 450000}
      sunPosition={props.sunPosition ?? [0, 1, 0]}
      inclination={props.inclination ?? undefined}
      azimuth={props.azimuth ?? undefined}
      mieCoefficient={props.mieCoefficient ?? 0.005}
      mieDirectionalG={props.mieDirectionalG ?? 0.8}
      rayleigh={props.rayleigh ?? 0.5}
      turbidity={props.turbidity ?? 10}
    />
  ),

  Cloud: ({ props }: BaseComponentProps<ThreeProps<"Cloud">>) => (
    <DreiClouds limit={200}>
      <DreiCloud
        position={pos(props.position)}
        seed={props.seed ?? undefined}
        segments={props.segments ?? 20}
        bounds={props.bounds ?? [10, 2, 10]}
        volume={props.volume ?? 6}
        speed={props.speed ?? 0.2}
        fade={props.fade ?? 30}
        opacity={props.opacity ?? 0.6}
        color={props.color ?? "#ffffff"}
        growth={props.growth ?? 4}
      />
    </DreiClouds>
  ),

  // ── Special Materials ───────────────────────────────────────────────

  GlassSphere: ({ props }: BaseComponentProps<ThreeProps<"GlassSphere">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <sphereGeometry
        args={[
          props.radius ?? 1,
          props.widthSegments ?? 64,
          props.heightSegments ?? 32,
        ]}
      />
      <MeshTransmissionMaterial
        color={props.color ?? "#ffffff"}
        transmission={props.transmission ?? 1}
        thickness={props.thickness ?? 0.5}
        roughness={props.roughness ?? 0}
        chromaticAberration={props.chromaticAberration ?? 0.06}
        ior={props.ior ?? 1.5}
        distortion={props.distortion ?? 0}
        distortionScale={props.distortionScale ?? 0.3}
        temporalDistortion={props.temporalDistortion ?? 0.5}
        samples={props.samples ?? 10}
        resolution={props.resolution ?? 256}
        backside
      />
    </mesh>
  ),

  GlassBox: ({ props }: BaseComponentProps<ThreeProps<"GlassBox">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <boxGeometry
        args={[props.width ?? 1, props.height ?? 1, props.depth ?? 1]}
      />
      <MeshTransmissionMaterial
        color={props.color ?? "#ffffff"}
        transmission={props.transmission ?? 1}
        thickness={props.thickness ?? 0.5}
        roughness={props.roughness ?? 0}
        chromaticAberration={props.chromaticAberration ?? 0.06}
        ior={props.ior ?? 1.5}
        distortion={props.distortion ?? 0}
        distortionScale={props.distortionScale ?? 0.3}
        temporalDistortion={props.temporalDistortion ?? 0.5}
        samples={props.samples ?? 10}
        resolution={props.resolution ?? 256}
        backside
      />
    </mesh>
  ),

  DistortSphere: ({
    props,
  }: BaseComponentProps<ThreeProps<"DistortSphere">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <sphereGeometry
        args={[
          props.radius ?? 1,
          props.widthSegments ?? 64,
          props.heightSegments ?? 32,
        ]}
      />
      <MeshDistortMaterial
        color={props.color ?? "#ff6600"}
        speed={props.speed ?? 2}
        distort={props.distort ?? 0.5}
        metalness={props.metalness ?? 0}
        roughness={props.roughness ?? 0.2}
      />
    </mesh>
  ),

  // ── Extended Geometry ───────────────────────────────────────────────

  TorusKnot: ({ props }: BaseComponentProps<ThreeProps<"TorusKnot">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
    >
      <torusKnotGeometry
        args={[
          props.radius ?? 1,
          props.tube ?? 0.4,
          props.tubularSegments ?? 64,
          props.radialSegments ?? 8,
          props.p ?? 2,
          props.q ?? 3,
        ]}
      />
      <MaterialComponent material={props.material} />
    </mesh>
  ),

  RoundedBox: ({ props }: BaseComponentProps<ThreeProps<"RoundedBox">>) => (
    <DreiRoundedBox
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      castShadow={props.castShadow ?? false}
      receiveShadow={props.receiveShadow ?? false}
      args={[props.width ?? 1, props.height ?? 1, props.depth ?? 1]}
      radius={props.radius ?? 0.05}
      smoothness={props.smoothness ?? 4}
    >
      <MaterialComponent material={props.material} />
    </DreiRoundedBox>
  ),

  // ── Shadows / Staging ───────────────────────────────────────────────

  ContactShadows: ({
    props,
  }: BaseComponentProps<ThreeProps<"ContactShadows">>) => (
    <DreiContactShadows
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      opacity={props.opacity ?? 0.5}
      width={props.width ?? 10}
      height={props.height ?? 10}
      blur={props.blur ?? 2}
      near={props.near ?? undefined}
      far={props.far ?? 10}
      smooth={props.smooth ?? true}
      resolution={props.resolution ?? 256}
      frames={props.frames ?? undefined}
      color={props.color ?? "#000000"}
    />
  ),

  Float: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"Float">> & { children?: ReactNode }) => (
    <DreiFloat
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      speed={props.speed ?? 1}
      rotationIntensity={props.rotationIntensity ?? 1}
      floatIntensity={props.floatIntensity ?? 1}
      enabled={props.enabled ?? true}
    >
      {children}
    </DreiFloat>
  ),

  ReflectorPlane: ({
    props,
  }: BaseComponentProps<ThreeProps<"ReflectorPlane">>) => (
    <mesh
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
    >
      <planeGeometry args={[props.width ?? 10, props.height ?? 10]} />
      <MeshReflectorMaterial
        color={props.color ?? "#888888"}
        resolution={props.resolution ?? 1024}
        blur={props.blur ? [props.blur, props.blur] : [300, 100]}
        mirror={props.mirror ?? 0.5}
        mixBlur={props.mixBlur ?? 10}
        mixStrength={props.mixStrength ?? 2}
        depthScale={props.depthScale ?? 0.1}
        metalness={props.metalness ?? 0.5}
        roughness={props.roughness ?? 1}
      />
    </mesh>
  ),

  Backdrop: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"Backdrop">> & { children?: ReactNode }) => (
    <DreiBackdrop
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      scale={scl(props.scale)}
      floor={props.floor ?? 0.25}
      segments={props.segments ?? 20}
      receiveShadow={props.receiveShadow ?? true}
    >
      {children}
    </DreiBackdrop>
  ),

  // ── Crazy / Magic ─────────────────────────────────────────────────────

  MeshPortalMaterial: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"MeshPortalMaterial">> & {
    children?: ReactNode;
  }) => (
    <DreiMeshPortalMaterial
      blend={props.blend ?? 0}
      blur={props.blur ?? 0}
      resolution={props.resolution ?? 512}
    >
      {children}
    </DreiMeshPortalMaterial>
  ),

  HtmlLabel: ({ props }: BaseComponentProps<ThreeProps<"HtmlLabel">>) => (
    <DreiHtml
      position={pos(props.position)}
      transform={props.transform ?? true}
      distanceFactor={props.distanceFactor ?? 10}
      center={props.center ?? true}
      style={{
        color: props.color ?? "#ffffff",
        fontSize: props.fontSize ? `${props.fontSize}px` : "16px",
        fontFamily: "system-ui, sans-serif",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {props.text}
    </DreiHtml>
  ),

  // ── Post-Processing ────────────────────────────────────────────────────

  EffectComposer: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"EffectComposer">> & {
    children?: ReactNode;
  }) => {
    if (props.enabled === false) return null;
    return (
      <postprocessing.EffectComposer multisampling={props.multisampling ?? 8}>
        {children}
      </postprocessing.EffectComposer>
    );
  },

  Bloom: ({ props }: BaseComponentProps<ThreeProps<"Bloom">>) => (
    <postprocessing.Bloom
      intensity={props.intensity ?? 1.5}
      luminanceThreshold={props.luminanceThreshold ?? 0.1}
      luminanceSmoothing={props.luminanceSmoothing ?? 0.025}
      mipmapBlur={props.mipmapBlur ?? true}
    />
  ),

  Glitch: ({ props }: BaseComponentProps<ThreeProps<"Glitch">>) => {
    const delay = props.delay ? new THREE.Vector2(...props.delay) : undefined;
    const duration = props.duration
      ? new THREE.Vector2(...props.duration)
      : undefined;
    const strength = props.strength
      ? new THREE.Vector2(...props.strength)
      : undefined;
    return (
      <postprocessing.Glitch
        delay={delay}
        duration={duration}
        strength={strength}
        active={props.active ?? true}
        ratio={props.ratio ?? 0.85}
      />
    );
  },

  Vignette: ({ props }: BaseComponentProps<ThreeProps<"Vignette">>) => (
    <postprocessing.Vignette
      offset={props.offset ?? 0.5}
      darkness={props.darkness ?? 0.5}
    />
  ),

  // ── Animation Wrappers ──────────────────────────────────────────────

  WarpTunnel: (() => {
    function TunnelRing({
      index,
      ringCount,
      radius,
      length,
      speed,
      tubeRadius,
      color,
    }: {
      index: number;
      ringCount: number;
      radius: number;
      length: number;
      speed: number;
      tubeRadius: number;
      color: THREE.Color;
    }) {
      const meshRef = useRef<THREE.Mesh>(null);
      const spacing = length / ringCount;

      useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        const z =
          ((((-index * spacing + t * speed) % length) + length) % length) -
          length;
        meshRef.current.position.z = z;
        const distFactor = 1 - Math.abs(z) / length;
        const s = 0.3 + distFactor * 0.7;
        meshRef.current.scale.set(s, s, s);
      });

      return (
        <mesh ref={meshRef} rotation={[0, 0, (index * Math.PI) / 12]}>
          <torusGeometry args={[radius, tubeRadius, 16, 64]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={3}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    }

    return ({ props }: BaseComponentProps<ThreeProps<"WarpTunnel">>) => {
      const ringCount = props.ringCount ?? 80;
      const radius = props.radius ?? 3;
      const length = props.length ?? 40;
      const speed = props.speed ?? 8;
      const tubeRadius = props.tubeRadius ?? 0.02;
      const color1 = props.color1 ?? "#00ffff";
      const color2 = props.color2 ?? "#ff00ff";

      const colors = useMemo(() => {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        return Array.from({ length: ringCount }, (_, i) =>
          new THREE.Color().lerpColors(c1, c2, i / ringCount),
        );
      }, [ringCount, color1, color2]);

      return (
        <group
          position={pos(props.position)}
          rotation={rot(props.rotation)}
          scale={scl(props.scale)}
        >
          {colors.map((color, i) => (
            <TunnelRing
              key={i}
              index={i}
              ringCount={ringCount}
              radius={radius}
              length={length}
              speed={speed}
              tubeRadius={tubeRadius}
              color={color}
            />
          ))}
        </group>
      );
    };
  })(),

  Spin: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"Spin">> & { children?: ReactNode }) => {
    const ref = useRef<THREE.Group>(null);
    const speed = props.speed ?? 1;
    const axis = props.axis ?? "y";

    useFrame((_, delta) => {
      if (!ref.current) return;
      if (axis === "x") ref.current.rotation.x += delta * speed;
      else if (axis === "z") ref.current.rotation.z += delta * speed;
      else ref.current.rotation.y += delta * speed;
    });

    return (
      <group
        ref={ref}
        position={pos(props.position)}
        rotation={rot(props.rotation)}
        scale={scl(props.scale)}
      >
        {children}
      </group>
    );
  },

  Orbit: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"Orbit">> & { children?: ReactNode }) => {
    const ref = useRef<THREE.Group>(null);
    const speed = props.speed ?? 1;
    const radius = props.radius ?? 3;
    const tilt = props.tilt ?? 0;
    const baseY = props.position?.[1] ?? 0;

    useFrame((state) => {
      if (!ref.current) return;
      const t = state.clock.elapsedTime * speed;
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.position.y = baseY + Math.sin(t * 0.7) * tilt;
    });

    return <group ref={ref}>{children}</group>;
  },

  Pulse: ({
    props,
    children,
  }: BaseComponentProps<ThreeProps<"Pulse">> & { children?: ReactNode }) => {
    const ref = useRef<THREE.Group>(null);
    const speed = props.speed ?? 1;
    const min = props.min ?? 0.8;
    const max = props.max ?? 1.2;

    useFrame((state) => {
      if (!ref.current) return;
      const t = (Math.sin(state.clock.elapsedTime * speed) + 1) / 2;
      const s = min + t * (max - min);
      ref.current.scale.setScalar(s);
    });

    return (
      <group
        ref={ref}
        position={pos(props.position)}
        rotation={rot(props.rotation)}
      >
        {children}
      </group>
    );
  },

  CameraShake: ({ props }: BaseComponentProps<ThreeProps<"CameraShake">>) => (
    <DreiCameraShake
      intensity={props.intensity ?? 0.5}
      maxYaw={props.maxYaw ?? 0.1}
      maxPitch={props.maxPitch ?? 0.1}
      maxRoll={props.maxRoll ?? 0.1}
    />
  ),

  // ── Camera / Controls ──────────────────────────────────────────────

  PerspectiveCamera: ({
    props,
  }: BaseComponentProps<ThreeProps<"PerspectiveCamera">>) => (
    <DreiPerspectiveCamera
      position={pos(props.position)}
      rotation={rot(props.rotation)}
      fov={props.fov ?? 50}
      near={props.near ?? 0.1}
      far={props.far ?? 1000}
      makeDefault={props.makeDefault ?? false}
    />
  ),

  OrbitControls: ({
    props,
  }: BaseComponentProps<ThreeProps<"OrbitControls">>) => (
    <DreiOrbitControls
      enableDamping={props.enableDamping ?? true}
      dampingFactor={props.dampingFactor ?? 0.05}
      enableZoom={props.enableZoom ?? true}
      enablePan={props.enablePan ?? true}
      enableRotate={props.enableRotate ?? true}
      minDistance={props.minDistance ?? undefined}
      maxDistance={props.maxDistance ?? undefined}
      minPolarAngle={props.minPolarAngle ?? undefined}
      maxPolarAngle={props.maxPolarAngle ?? undefined}
      autoRotate={props.autoRotate ?? false}
      autoRotateSpeed={props.autoRotateSpeed ?? 2}
      target={props.target ?? undefined}
    />
  ),
};

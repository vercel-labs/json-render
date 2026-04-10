import type { Scene } from "./_helpers";

export const splatPostFx: Scene = {
  name: "Splat + Post-Processing",
  description:
    "A gaussian splat with bloom and vignette post-processing effects",
  spec: {
    root: "scene",
    elements: {
      scene: {
        type: "Group",
        props: { position: null, rotation: null, scale: null },
        children: [
          "camera",
          "env",
          "ambient",
          "key-light",
          "splat",
          "grid",
          "fx",
          "controls",
        ],
      },
      camera: {
        type: "PerspectiveCamera",
        props: {
          position: [3, 2, 5],
          rotation: null,
          scale: null,
          fov: 50,
          near: null,
          far: null,
          makeDefault: true,
        },
        children: [],
      },
      env: {
        type: "Environment",
        props: {
          preset: "night",
          background: false,
          blur: 0.8,
          intensity: 0.4,
        },
        children: [],
      },
      ambient: {
        type: "AmbientLight",
        props: { color: "#ccccff", intensity: 0.2 },
        children: [],
      },
      "key-light": {
        type: "PointLight",
        props: {
          position: [3, 5, 3],
          rotation: null,
          scale: null,
          color: "#ffeecc",
          intensity: 30,
          distance: 20,
          decay: null,
          castShadow: null,
        },
        children: [],
      },
      splat: {
        type: "GaussianSplat",
        props: {
          src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat",
          position: [0, 0, 0],
          rotation: null,
          scale: [1, 1, 1],
          castShadow: null,
          receiveShadow: null,
          alphaHash: null,
          toneMapped: null,
          visible: true,
        },
        children: [],
      },
      grid: {
        type: "GridHelper",
        props: {
          position: [0, -0.5, 0],
          rotation: null,
          scale: null,
          size: 20,
          divisions: 20,
          color: "#222222",
          secondaryColor: "#111111",
        },
        children: [],
      },
      fx: {
        type: "EffectComposer",
        props: { enabled: true, multisampling: 8 },
        children: ["bloom", "vignette"],
      },
      bloom: {
        type: "Bloom",
        props: {
          intensity: 0.8,
          luminanceThreshold: 0.2,
          luminanceSmoothing: 0.5,
          mipmapBlur: true,
        },
        children: [],
      },
      vignette: {
        type: "Vignette",
        props: { offset: 0.25, darkness: 0.7 },
        children: [],
      },
      controls: {
        type: "OrbitControls",
        props: {
          enableDamping: true,
          dampingFactor: null,
          enableZoom: null,
          enablePan: null,
          enableRotate: null,
          minDistance: 2,
          maxDistance: 12,
          minPolarAngle: 0.3,
          maxPolarAngle: 1.5,
          autoRotate: true,
          autoRotateSpeed: 0.5,
          target: [0, 0.5, 0],
        },
        children: [],
      },
    },
  },
};

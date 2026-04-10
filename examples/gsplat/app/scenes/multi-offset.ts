import type { Scene } from "./_helpers";

export const multiOffset: Scene = {
  name: "Multi-Splat (Offset)",
  description:
    "Two splats placed away from the origin — demonstrates off-center orbit",
  spec: {
    root: "viewer",
    elements: {
      viewer: {
        type: "GaussianSplatViewer",
        props: {
          width: "100%",
          height: "100vh",
          backgroundColor: "#0a0a0a",
          controls: true,
          autoRotate: true,
          autoRotateSpeed: 0.4,
          cameraPosition: [5, 3, 8],
          cameraTarget: [3, 0.5, 3],
          fov: 50,
        },
        children: [],
      },
    },
  },
  viewer: {
    backgroundColor: "#0a0a0a",
    controls: true,
    autoRotate: true,
    autoRotateSpeed: 0.4,
    cameraPosition: [5, 3, 8],
    cameraTarget: [3, 0.5, 3],
    fov: 50,
  },
  splats: [
    {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat",
      position: [1.5, 0, 3],
    },
    {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/stump/stump-7k.splat",
      position: [4.5, 0, 3],
      scale: [0.8, 0.8, 0.8],
    },
  ],
};

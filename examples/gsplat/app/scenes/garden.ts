import type { Scene } from "./_helpers";

export const garden: Scene = {
  name: "Garden",
  description: "A garden scene captured with gaussian splatting",
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
          autoRotateSpeed: 0.3,
          cameraPosition: [2, 2, 5],
          cameraTarget: [0, 0, 0],
          fov: 60,
        },
        children: [],
      },
    },
  },
  viewer: {
    backgroundColor: "#0a0a0a",
    controls: true,
    autoRotate: true,
    autoRotateSpeed: 0.3,
    cameraPosition: [2, 2, 5],
    cameraTarget: [0, 0, 0],
    fov: 60,
  },
  splats: [
    {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/garden/garden-7k.splat",
      position: [0, 0, 0],
    },
  ],
};

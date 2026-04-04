import type { Scene } from "./_helpers";

export const kitchen: Scene = {
  name: "Kitchen",
  description: "An indoor kitchen scan showing spatial depth and lighting",
  spec: {
    root: "viewer",
    elements: {
      viewer: {
        type: "GaussianSplatViewer",
        props: {
          width: "100%",
          height: "100vh",
          backgroundColor: "#0d0d0d",
          controls: true,
          autoRotate: true,
          autoRotateSpeed: 0.3,
          cameraPosition: [2, 2, 4],
          cameraTarget: [0, 0.5, 0],
          fov: 55,
        },
        children: [],
      },
    },
  },
  viewer: {
    backgroundColor: "#0d0d0d",
    controls: true,
    autoRotate: true,
    autoRotateSpeed: 0.3,
    cameraPosition: [2, 2, 4],
    cameraTarget: [0, 0.5, 0],
    fov: 55,
  },
  splats: [
    {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/kitchen/kitchen-7k.splat",
      position: [0, 0, 0],
    },
  ],
};

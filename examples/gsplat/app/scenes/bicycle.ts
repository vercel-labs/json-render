import type { Scene } from "./_helpers";

export const bicycle: Scene = {
  name: "Bicycle",
  description: "A bicycle scene captured with gaussian splatting",
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
          cameraPosition: [3, 2, 5],
          cameraTarget: [0, 0, 0],
          fov: 55,
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
    cameraPosition: [3, 2, 5],
    cameraTarget: [0, 0, 0],
    fov: 55,
  },
  splats: [
    {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bicycle/bicycle-7k.splat",
      position: [0, 0, 0],
    },
  ],
};

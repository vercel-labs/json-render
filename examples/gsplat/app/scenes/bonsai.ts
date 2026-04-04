import type { Scene } from "./_helpers";

export const bonsai: Scene = {
  name: "Bonsai",
  description: "A bonsai tree captured with gaussian splatting",
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
          autoRotateSpeed: 0.5,
          cameraPosition: [0, 1.5, 3],
          cameraTarget: [0, 0.5, 0],
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
    autoRotateSpeed: 0.5,
    cameraPosition: [0, 1.5, 3],
    cameraTarget: [0, 0.5, 0],
    fov: 50,
  },
  splats: [
    {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat",
      position: [0, 0, 0],
    },
  ],
};

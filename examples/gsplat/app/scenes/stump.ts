import type { Scene } from "./_helpers";

export const stump: Scene = {
  name: "Stump",
  description: "A tree stump with organic textures and natural detail",
  spec: {
    root: "viewer",
    elements: {
      viewer: {
        type: "GaussianSplatViewer",
        props: {
          width: "100%",
          height: "100vh",
          backgroundColor: "#080808",
          controls: true,
          autoRotate: true,
          autoRotateSpeed: 0.6,
          cameraPosition: [1.5, 1.5, 3],
          cameraTarget: [0, 0.3, 0],
          fov: 45,
        },
        children: [],
      },
    },
  },
  viewer: {
    backgroundColor: "#080808",
    controls: true,
    autoRotate: true,
    autoRotateSpeed: 0.6,
    cameraPosition: [1.5, 1.5, 3],
    cameraTarget: [0, 0.3, 0],
    fov: 45,
  },
  splats: [
    {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/stump/stump-7k.splat",
      position: [0, 0, 0],
    },
  ],
};

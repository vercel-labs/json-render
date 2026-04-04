import type { Spec } from "@json-render/core";

export type ViewerConfig = {
  backgroundColor?: string;
  controls?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  fov?: number;
};

export type Scene = {
  name: string;
  description: string;
  spec: Spec;
  viewer: ViewerConfig;
  splats: Array<{
    src: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  }>;
};

export type ViewerConfig = {
  backgroundColor?: string;
  controls?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  fov?: number;
};

// The "spec" here is just JSON shown next to the viewer for illustration —
// the example doesn't actually render specs, so we keep it as a plain object.
export type Scene = {
  name: string;
  description: string;
  spec: Record<string, unknown>;
  viewer: ViewerConfig;
  splats: Array<{
    src: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  }>;
};

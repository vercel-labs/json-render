declare module "gsplat" {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
  }

  export class Quaternion {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number;
    y: number;
    z: number;
    w: number;
  }

  export class Splat {
    get position(): Vector3;
    set position(position: Vector3);
    get rotation(): Quaternion;
    set rotation(rotation: Quaternion);
    get scale(): Vector3;
    set scale(scale: Vector3);
    get visible(): boolean;
    set visible(visible: boolean);
  }

  export class Scene {
    constructor();
  }

  export class Camera {
    constructor();
    get position(): Vector3;
    set position(position: Vector3);
    get rotation(): Quaternion;
    set rotation(rotation: Quaternion);
    data: CameraData;
  }

  export class CameraData {
    get fx(): number;
    set fx(fx: number);
    get fy(): number;
    set fy(fy: number);
  }

  export class WebGLRenderer {
    constructor(canvas?: HTMLCanvasElement);
    canvas: HTMLCanvasElement;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }

  export class OrbitControls {
    constructor(camera: Camera, canvas: HTMLCanvasElement);
    setCameraTarget(target: Vector3): void;
    minAngle: number;
    maxAngle: number;
    minZoom: number;
    maxZoom: number;
    orbitSpeed: number;
    panSpeed: number;
    zoomSpeed: number;
    dampening: number;
    update(): void;
    dispose(): void;
  }

  export class Loader {
    static LoadAsync(
      url: string,
      scene: Scene,
      onProgress?: (progress: number) => void,
      useCache?: boolean,
    ): Promise<Splat>;
  }
}

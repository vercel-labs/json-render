declare module "gsplat" {
  export class Scene {
    constructor();
  }

  export class Camera {
    constructor();
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
    update(): void;
    dispose(): void;
  }

  export class Loader {
    static LoadAsync(
      url: string,
      scene: Scene,
      onProgress?: (progress: number) => void,
    ): Promise<void>;
  }
}

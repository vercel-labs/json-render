import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { GsplatProps } from "../catalog";

type Vec3 = [number, number, number];
const DEFAULT_POS: Vec3 = [0, 0, 0];
const DEFAULT_ROT: Vec3 = [0, 0, 0];
const DEFAULT_SCALE: Vec3 = [1, 1, 1];

export interface GaussianSplatHandle {
  src: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

interface SplatProps {
  props: GsplatProps<"GaussianSplat">;
}

/**
 * Registers a gaussian splat to be loaded by the parent GaussianSplatViewer.
 * This component doesn't render DOM — it communicates splat config to the viewer
 * via context or imperative handles.
 */
export const GaussianSplatComponent = forwardRef<
  GaussianSplatHandle,
  SplatProps
>(function GaussianSplatComponent({ props }, ref) {
  const config = useRef<GaussianSplatHandle>({
    src: props.src,
    position: props.position ?? DEFAULT_POS,
    rotation: props.rotation ?? DEFAULT_ROT,
    scale: props.scale ?? DEFAULT_SCALE,
  });

  useEffect(() => {
    config.current = {
      src: props.src,
      position: props.position ?? DEFAULT_POS,
      rotation: props.rotation ?? DEFAULT_ROT,
      scale: props.scale ?? DEFAULT_SCALE,
    };
  }, [props.src, props.position, props.rotation, props.scale]);

  useImperativeHandle(ref, () => config.current, [props]);

  // This component contributes splat data; actual rendering is managed
  // by GaussianSplatViewer which owns the WebGL canvas.
  return null;
});

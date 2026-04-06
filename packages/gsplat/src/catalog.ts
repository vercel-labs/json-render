import { z } from "zod";
import { vector3Schema, transformProps } from "./schemas";

/**
 * Gaussian Splatting component definitions for json-render catalogs.
 *
 * These provide standalone gaussian splat rendering powered by
 * @mkkellogg/gaussian-splats-3d. Use GaussianSplatViewer as a container
 * with built-in controls, and GaussianSplat to load individual splat files.
 */
export const gsplatComponentDefinitions = {
  // ===========================================================================
  // Core
  // ===========================================================================

  GaussianSplat: {
    props: z.object({
      src: z.string(),
      ...transformProps,
      visible: z.boolean().nullable(),
    }),
    description:
      "Loads and renders a .splat or .ply gaussian splat file. Use src to point to a splat file URL. Position, rotation, and scale control placement in world space.",
    example: {
      src: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat",
      position: [0, 0, 0],
    },
  },

  // ===========================================================================
  // Viewer
  // ===========================================================================

  GaussianSplatViewer: {
    props: z.object({
      width: z.string().nullable(),
      height: z.string().nullable(),
      backgroundColor: z.string().nullable(),
      controls: z.boolean().nullable(),
      autoRotate: z.boolean().nullable(),
      autoRotateSpeed: z.number().nullable(),
      cameraPosition: vector3Schema.nullable(),
      cameraTarget: vector3Schema.nullable(),
      fov: z.number().nullable(),
      progressBarColor: z.string().nullable(),
      progressTrackColor: z.string().nullable(),
      progressTextColor: z.string().nullable(),
      progressBackgroundColor: z.string().nullable(),
    }),
    slots: ["default"],
    description:
      "Container for GaussianSplat components. Provides a WebGL canvas with built-in orbit camera controls, auto-rotation, and loading state management. Set width/height for canvas dimensions.",
    example: {
      width: "100%",
      height: "100vh",
      controls: true,
      autoRotate: true,
      cameraPosition: [0, 2, 5],
    },
  },
};

export type GsplatProps<K extends keyof typeof gsplatComponentDefinitions> =
  z.output<(typeof gsplatComponentDefinitions)[K]["props"]>;

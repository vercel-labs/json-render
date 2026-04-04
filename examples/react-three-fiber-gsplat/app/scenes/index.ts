import type { Scene } from "./_helpers";
import { splatShowroom } from "./splat-showroom";
import { splatWithPrimitives } from "./splat-with-primitives";
import { multiSplat } from "./multi-splat";
import { splatPostFx } from "./splat-postfx";
import { floatingSplat } from "./floating-splat";
export type { Scene };

export const scenes: Scene[] = [
  splatShowroom,
  splatWithPrimitives,
  multiSplat,
  splatPostFx,
  floatingSplat,
];

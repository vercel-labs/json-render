import type { Scene } from "./_helpers";
import { bonsai } from "./bonsai";
import { garden } from "./garden";
import { bicycle } from "./bicycle";
import { kitchen } from "./kitchen";
import { stump } from "./stump";
import { multiOffset } from "./multi-offset";
export type { Scene };

export const scenes: Scene[] = [
  bonsai,
  garden,
  bicycle,
  kitchen,
  stump,
  multiOffset,
];

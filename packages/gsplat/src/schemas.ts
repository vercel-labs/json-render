import { z } from "zod";

export const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const transformProps = {
  position: vector3Schema.nullable(),
  rotation: vector3Schema.nullable(),
  scale: vector3Schema.nullable(),
} as const;

export const qualitySchema = z.enum(["low", "medium", "high"]);

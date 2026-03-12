import { z } from "zod";

export const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const materialSchema = z.object({
  color: z.string().nullable(),
  metalness: z.number().nullable(),
  roughness: z.number().nullable(),
  emissive: z.string().nullable(),
  emissiveIntensity: z.number().nullable(),
  opacity: z.number().nullable(),
  transparent: z.boolean().nullable(),
  wireframe: z.boolean().nullable(),
});

export const transformProps = {
  position: vector3Schema.nullable(),
  rotation: vector3Schema.nullable(),
  scale: vector3Schema.nullable(),
} as const;

export const shadowProps = {
  castShadow: z.boolean().nullable(),
  receiveShadow: z.boolean().nullable(),
} as const;

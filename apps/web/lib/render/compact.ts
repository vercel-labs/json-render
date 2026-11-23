import { createCompactGeneration } from "@json-render/core";
import { playgroundCatalog } from "./catalog";

export const compactGeneration = createCompactGeneration(
  playgroundCatalog.data,
);

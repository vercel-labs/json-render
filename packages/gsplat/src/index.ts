import type React from "react";
import { GaussianSplatComponent } from "./components/GaussianSplat";
import { GaussianSplatViewerComponent } from "./components/GaussianSplatViewer";

// Component implementations
export { GaussianSplatComponent } from "./components/GaussianSplat";
export { GaussianSplatViewerComponent } from "./components/GaussianSplatViewer";
export type { GaussianSplatHandle } from "./components/GaussianSplat";

// Component map for registry
export const gsplatComponents: Record<string, React.ComponentType<any>> = {
  GaussianSplat: GaussianSplatComponent as any,
  GaussianSplatViewer: GaussianSplatViewerComponent as any,
};

// Catalog definitions (also available via @json-render/gsplat/catalog)
export { gsplatComponentDefinitions, type GsplatProps } from "./catalog";

// Shared schemas
export { vector3Schema, transformProps, qualitySchema } from "./schemas";

// Renderer
export { GsplatRenderer, type GsplatRendererProps } from "./renderer";

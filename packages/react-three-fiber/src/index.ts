// Component implementations
export { threeComponents } from "./components";

// Catalog definitions (also available via @json-render/react-three-fiber/catalog)
export {
  threeComponentDefinitions,
  type ComponentDefinition,
  type ThreeProps,
} from "./catalog";

// Shared schemas
export {
  vector3Schema,
  materialSchema,
  transformProps,
  shadowProps,
} from "./schemas";

// Renderer
export {
  ThreeRenderer,
  ThreeCanvas,
  type ThreeRendererProps,
  type ThreeCanvasProps,
} from "./renderer";

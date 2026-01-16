import { describe, it, expect } from "vitest";
import { createRendererFromCatalog } from "./renderer";

// Mock catalog object that matches the Catalog interface
const mockCatalog = {
  name: "test",
  componentNames: ["text", "button"],
  actionNames: [],
  functionNames: [],
  validation: "strict" as const,
  components: {},
  actions: {},
  functions: {},
  elementSchema: {} as never,
  treeSchema: {} as never,
  hasComponent: () => true,
  hasAction: () => false,
  hasFunction: () => false,
  validateElement: () => ({ success: true }),
  validateTree: () => ({ success: true }),
};

describe("createRendererFromCatalog", () => {
  it("creates a SolidJS component from catalog and registry", () => {
    const registry = {
      text: (props: { element: { props: { content: string } } }) => (
        <span>{props.element.props.content}</span>
      ),
      button: (props: { element: { props: { label: string } } }) => (
        <button>{props.element.props.label}</button>
      ),
    };

    const CatalogRenderer = createRendererFromCatalog(mockCatalog, registry);

    expect(typeof CatalogRenderer).toBe("function");
  });

  it("returned component is a valid SolidJS component", () => {
    const registry = {
      text: () => <span />,
    };

    const CatalogRenderer = createRendererFromCatalog(mockCatalog, registry);

    // Verify it can be called as a component function
    expect(typeof CatalogRenderer).toBe("function");
    // It should accept props including tree, loading, and fallback
    expect(CatalogRenderer.length).toBe(1); // SolidJS components take props as single argument
  });

  it("returned component accepts loading prop", () => {
    const registry = {
      text: () => <span />,
    };

    const CatalogRenderer = createRendererFromCatalog(mockCatalog, registry);

    // Create element with loading prop
    const element = <CatalogRenderer tree={null} loading={true} />;
    expect(element).toBeDefined();
  });

  it("returned component accepts fallback prop", () => {
    const registry = {
      text: () => <span />,
    };

    const Fallback = () => <div>Unknown component</div>;

    const CatalogRenderer = createRendererFromCatalog(mockCatalog, registry);

    // Create element with fallback prop
    const element = <CatalogRenderer tree={null} fallback={Fallback} />;
    expect(element).toBeDefined();
  });
});

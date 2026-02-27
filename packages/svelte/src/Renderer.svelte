<script module lang="ts">
  import type { Spec } from "@json-render/core";
  import ElementRenderer from "./ElementRenderer.svelte";
  import type { ComponentRegistry, ComponentRenderer } from "./renderer.js";

  /**
   * Props for the Renderer component
   */
  export interface RendererProps {
    /** The UI spec to render */
    spec: Spec | null;
    /** Component registry */
    registry: ComponentRegistry;
    /** Whether the spec is currently loading/streaming */
    loading?: boolean;
    /** Fallback component for unknown types */
    fallback?: ComponentRenderer;
  }
</script>

<script lang="ts">
  let { spec, registry, loading = false, fallback }: RendererProps = $props();

  let rootElement = $derived(spec?.root ? spec.elements[spec.root] : undefined);
</script>

{#if spec && rootElement}
  <ElementRenderer
    element={rootElement}
    {spec}
    {registry}
    {loading}
    {fallback} />
{/if}

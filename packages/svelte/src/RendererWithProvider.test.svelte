<script lang="ts">
  import type { Spec, ActionHandler } from "@json-render/core";
  import type { ComponentRegistry, ComponentRenderer } from "./renderer.js";
  import StateProvider from "./contexts/StateProvider.svelte";
  import VisibilityProvider from "./contexts/VisibilityProvider.svelte";
  import ValidationProvider from "./contexts/ValidationProvider.svelte";
  import ActionProvider from "./contexts/ActionProvider.svelte";
  import Renderer from "./Renderer.svelte";

  interface Props {
    spec: Spec | null;
    registry: ComponentRegistry;
    loading?: boolean;
    fallback?: ComponentRenderer;
    initialState?: Record<string, unknown>;
    handlers?: Record<string, ActionHandler>;
  }

  let {
    spec,
    registry,
    loading = false,
    fallback,
    initialState = {},
    handlers = {},
  }: Props = $props();
</script>

<StateProvider {initialState}>
  <VisibilityProvider>
    <ValidationProvider>
      <ActionProvider {handlers}>
        <Renderer {spec} {registry} {loading} {fallback} />
      </ActionProvider>
    </ValidationProvider>
  </VisibilityProvider>
</StateProvider>

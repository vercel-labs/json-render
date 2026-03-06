<script lang="ts">
  import {
    ActionProvider,
    ValidationProvider,
    VisibilityProvider,
    Renderer,
    getStateContext,
  } from "@json-render/svelte";
  import type { Spec } from "@json-render/core";
  import { registry } from "./registry";
  import { makeHandlers } from "../shared/handlers";

  interface Props {
    spec: Spec;
  }

  let { spec }: Props = $props();
  const state = getStateContext();
  const handlers = makeHandlers(state.get, state.set);
</script>

<ActionProvider {handlers}>
  <VisibilityProvider>
    <ValidationProvider>
      <Renderer {spec} {registry} />
    </ValidationProvider>
  </VisibilityProvider>
</ActionProvider>

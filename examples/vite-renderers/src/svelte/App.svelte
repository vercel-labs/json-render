<script lang="ts">
  import type { Spec } from "@json-render/core";
  import { StateProvider } from "@json-render/svelte";
  import DemoRenderer from "./DemoRenderer.svelte";

  interface Props {
    initialRenderer?: string;
    spec: Spec;
  }

  let { initialRenderer = "svelte", spec }: Props = $props();
  let initialState = $derived({
    ...spec.state,
    renderer: initialRenderer,
  });
</script>

<div class={"renderer-" + initialRenderer}>
  <StateProvider {initialState}>
    <DemoRenderer {spec} />
  </StateProvider>
</div>

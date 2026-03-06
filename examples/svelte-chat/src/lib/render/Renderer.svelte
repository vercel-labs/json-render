<script lang="ts">
  import { Renderer, JsonUIProvider } from "@json-render/svelte";
  import type { Spec } from "@json-render/svelte";
  import { registry } from "./registry";

  interface Props {
    spec: Spec;
    loading?: boolean;
  }

  let { spec, loading = false }: Props = $props();
</script>

<JsonUIProvider initialState={spec.state}>
  <Renderer {spec} {registry} {loading} />
</JsonUIProvider>

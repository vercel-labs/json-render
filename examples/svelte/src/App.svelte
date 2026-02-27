<script lang="ts">
  import { StateProvider } from "@json-render/svelte";
  import { demoSpec } from "./lib/spec";
  import DemoRenderer from "./DemoRenderer.svelte";

  const initialState = demoSpec.state ?? {};
</script>

<StateProvider {initialState}>
  <DemoRenderer />
</StateProvider>

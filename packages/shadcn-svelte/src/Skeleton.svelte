<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Skeleton">> {}

  let { props }: Props = $props();
</script>

<div
  class={`animate-pulse bg-muted ${props.rounded ? "rounded-full" : "rounded-md"}`}
  style={`width:${props.width ?? "100%"};height:${props.height ?? "1rem"};`}
></div>

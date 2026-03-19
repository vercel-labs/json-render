<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Spinner">> {}

  let { props }: Props = $props();

  const sizeClass = $derived(
    props.size === "sm" ? "size-4" : props.size === "lg" ? "size-8" : "size-6",
  );
</script>

<div class="inline-flex items-center gap-2 text-muted-foreground">
  <div class={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClass}`}></div>
  {#if props.label}
    <span class="text-sm">{props.label}</span>
  {/if}
</div>

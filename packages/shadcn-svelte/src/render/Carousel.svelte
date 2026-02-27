<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Carousel">> {}

  let { props }: Props = $props();

  const items = $derived(props.items ?? []);
</script>

<div class="overflow-x-auto">
  <div class="flex gap-3 pb-1">
    {#each items as item}
      <div class="min-w-[220px] flex-1 rounded-lg border bg-card p-4">
        {#if item.title}
          <h4 class="font-medium">{item.title}</h4>
        {/if}
        {#if item.description}
          <p class="text-sm text-muted-foreground">{item.description}</p>
        {/if}
      </div>
    {/each}
  </div>
</div>

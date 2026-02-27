<script lang="ts">
  import type { Snippet } from "svelte";
  import { getStateValue } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Drawer">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  function openValue() {
    return getStateValue(props.openPath);
  }

  const open = $derived(Boolean(openValue().current));

  function close() {
    openValue().current = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 bg-black/50" onclick={close}>
    <div class="absolute bottom-0 left-0 right-0 rounded-t-xl border bg-background p-4 shadow-lg" onclick={(e) => e.stopPropagation()}>
      <div class="mb-4">
        <h3 class="text-lg font-semibold">{props.title}</h3>
        {#if props.description}
          <p class="text-sm text-muted-foreground">{props.description}</p>
        {/if}
      </div>
      {@render children?.()}
    </div>
  </div>
{/if}

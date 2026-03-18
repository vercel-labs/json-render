<script lang="ts">
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { getStateValue } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Drawer">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const openState = getStateValue(untrack(() => props.openPath));
  const open = $derived(Boolean(openState.current));

  function close() {
    openState.current = false;
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 bg-black/50"
    role="presentation"
    onclick={close}
    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") close(); }}
  >
    <div
      class="absolute bottom-0 left-0 right-0 rounded-t-xl border bg-background p-4 shadow-lg"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e: KeyboardEvent) => e.stopPropagation()}
    >
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

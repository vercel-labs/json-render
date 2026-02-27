<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Collapsible">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  let open = $state(props.defaultOpen ?? false);
</script>

<div class="w-full rounded-md border border-border">
  <button
    type="button"
    class="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium"
    onclick={() => (open = !open)}
  >
    <span>{props.title}</span>
    <span class={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
  </button>
  {#if open}
    <div class="px-4 pb-3 pt-1">{@render children?.()}</div>
  {/if}
</div>

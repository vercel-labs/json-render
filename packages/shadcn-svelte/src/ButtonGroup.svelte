<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"ButtonGroup">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state("");

  const bound = getBoundProp<string>(
    () => props.selected ?? undefined,
    () => bindings?.selected,
  );

  const value = $derived(bound.current ?? localValue);

  function choose(next: string) {
    localValue = next;
    bound.current = next;
    emit("change");
  }
</script>

<div class="inline-flex rounded-md border border-border">
  {#each props.buttons ?? [] as btn, i}
    <button
      type="button"
      class={`px-3 py-1.5 text-sm ${value === btn.value ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"} ${i > 0 ? "border-l border-border" : ""}`}
      onclick={() => choose(btn.value)}
    >
      {btn.label}
    </button>
  {/each}
</div>

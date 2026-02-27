<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Slider">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state(props.value ?? props.min ?? 0);

  function binding() {
    return getBoundProp<number>(
      () => props.value ?? undefined,
      () => bindings?.value,
    );
  }

  const value = $derived(binding().current ?? localValue);

  function handleInput(event: Event) {
    const next = Number((event.target as HTMLInputElement).value);
    localValue = next;
    binding().current = next;
    emit("change");
  }
</script>

<div class="space-y-2">
  {#if props.label}
    <div class="flex items-center justify-between text-sm">
      <span>{props.label}</span>
      <span class="text-muted-foreground">{value}</span>
    </div>
  {/if}
  <input
    type="range"
    min={props.min ?? 0}
    max={props.max ?? 100}
    step={props.step ?? 1}
    {value}
    oninput={handleInput}
    class="w-full"
  />
</div>

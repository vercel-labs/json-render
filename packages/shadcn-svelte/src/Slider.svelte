<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Slider } from "./ui/slider/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Slider">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state(untrack(() => props.value ?? props.min ?? 0));

  const bound = getBoundProp<number>(
    () => props.value ?? undefined,
    () => bindings?.value,
  );

  const value = $derived(bound.current ?? localValue);

  function handleChange(next: number) {
    localValue = next;
    bound.current = next;
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
  <Slider
    type="single"
    value={value}
    min={props.min ?? 0}
    max={props.max ?? 100}
    step={props.step ?? 1}
    onValueChange={handleChange}
    class="w-full"
  />
</div>

<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"ToggleGroup">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state("");

  const bound = getBoundProp<string>(
    () => props.value ?? undefined,
    () => bindings?.value,
  );

  const value = $derived(bound.current ?? localValue);
  const selectedValues = $derived(value ? value.split(",").filter(Boolean) : []);

  function setValue(v: string) {
    localValue = v;
    bound.current = v;
    emit("change");
  }

  function handleClick(itemValue: string) {
    if ((props.type ?? "single") === "multiple") {
      const next = new Set(selectedValues);
      if (next.has(itemValue)) next.delete(itemValue);
      else next.add(itemValue);
      setValue(Array.from(next).join(","));
      return;
    }
    setValue(itemValue);
  }
</script>

<div class="inline-flex rounded-md border border-border p-1 gap-1">
  {#each props.items ?? [] as item}
    <button
      type="button"
      class={`rounded-sm px-2 py-1 text-sm ${selectedValues.includes(item.value) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
      onclick={() => handleClick(item.value)}
    >
      {item.label}
    </button>
  {/each}
</div>

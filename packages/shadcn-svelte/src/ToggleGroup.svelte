<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"ToggleGroup">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state("");

  const bound = getBoundProp<string>(
    () => props.value ?? undefined,
    () => bindings?.value,
  );

  const value = $derived(bound.current ?? localValue);
  const isMultiple = $derived((props.type ?? "single") === "multiple");
  const selectedValues = $derived(value ? value.split(",").filter(Boolean) : []);

  function handleChange(next: string | string[] | undefined) {
    const serialized = Array.isArray(next) ? next.join(",") : (next ?? "");
    localValue = serialized;
    bound.current = serialized;
    emit("change");
  }
</script>

{#if isMultiple}
  <ToggleGroup
    type="multiple"
    value={selectedValues}
    onValueChange={handleChange}
    variant="outline"
  >
    {#each props.items ?? [] as item}
      <ToggleGroupItem value={item.value}>{item.label}</ToggleGroupItem>
    {/each}
  </ToggleGroup>
{:else}
  <ToggleGroup
    type="single"
    value={selectedValues[0] ?? ""}
    onValueChange={handleChange}
    variant="outline"
  >
    {#each props.items ?? [] as item}
      <ToggleGroupItem value={item.value}>{item.label}</ToggleGroupItem>
    {/each}
  </ToggleGroup>
{/if}

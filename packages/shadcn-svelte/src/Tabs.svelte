<script lang="ts">
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import * as Tabs from "./ui/tabs/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Tabs">> {
    children?: Snippet;
  }

  let { props, children, bindings, emit }: Props = $props();

  const tabs = $derived(props.tabs ?? []);
  let localValue = $state(untrack(() => props.defaultValue ?? tabs[0]?.value ?? ""));
  let activeValue = $state(untrack(() => localValue));
  let previousValue = $state(untrack(() => activeValue));

  const bound = getBoundProp<string>(
    () => props.value ?? undefined,
    () => bindings?.value,
  );

  $effect(() => {
    const current = bound.current ?? localValue ?? tabs[0]?.value ?? "";
    if (current !== activeValue) {
      activeValue = current;
      previousValue = current;
    }
  });

  $effect(() => {
    if (activeValue === previousValue) return;
    previousValue = activeValue;
    localValue = activeValue;
    bound.current = activeValue;
    emit("change");
  });
</script>

<Tabs.Root bind:value={activeValue}>
  <Tabs.List>
    {#each tabs as tab}
      <Tabs.Trigger value={tab.value}>{tab.label}</Tabs.Trigger>
    {/each}
  </Tabs.List>
  {@render children?.()}
</Tabs.Root>

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import * as Tabs from "$lib/components/ui/tabs";

  interface Props extends BaseComponentProps<{
    defaultValue?: string | null;
    tabs: Array<{ value: string; label: string }>;
  }> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const defaultVal = $derived(
    props.defaultValue ?? (props.tabs ?? [])[0]?.value ?? ""
  );
</script>

<Tabs.Root value={defaultVal}>
  <Tabs.List>
    {#each props.tabs ?? [] as tab}
      <Tabs.Trigger value={tab.value}>{tab.label}</Tabs.Trigger>
    {/each}
  </Tabs.List>
  {#if children}
    {@render children()}
  {/if}
</Tabs.Root>

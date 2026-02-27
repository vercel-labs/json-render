<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import * as Tabs from "$lib/components/ui/tabs";

  interface Props extends BaseComponentProps<{
    value: string;
  }> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();
</script>

<Tabs.Content value={props.value}>
  {#if children}
    {@render children()}
  {/if}
</Tabs.Content>

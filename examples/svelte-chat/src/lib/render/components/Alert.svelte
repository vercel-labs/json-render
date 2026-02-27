<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import * as Alert from "$lib/components/ui/alert";

  interface Props extends BaseComponentProps<{
    variant?: "default" | "destructive" | null;
    title: string;
    description?: string | null;
  }> {}

  let { props }: Props = $props();
</script>

<Alert.Root variant={props.variant ?? "default"}>
  <Alert.Title>{props.title}</Alert.Title>
  {#if props.description}
    <Alert.Description>{props.description}</Alert.Description>
  {/if}
</Alert.Root>

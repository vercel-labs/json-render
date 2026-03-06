<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import * as Card from "$lib/components/ui/card";

  interface Props extends BaseComponentProps<{
    title?: string | null;
    description?: string | null;
  }> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();
</script>

<Card.Root>
  {#if props.title || props.description}
    <Card.Header>
      {#if props.title}
        <Card.Title>{props.title}</Card.Title>
      {/if}
      {#if props.description}
        <Card.Description>{props.description}</Card.Description>
      {/if}
    </Card.Header>
  {/if}
  <Card.Content class="flex flex-col gap-4">
    {#if children}
      {@render children()}
    {/if}
  </Card.Content>
</Card.Root>

<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import * as Accordion from "$lib/components/ui/accordion";

  interface Props extends BaseComponentProps<{
    items: Array<{ title: string; content: string }>;
    type?: "single" | "multiple" | null;
  }> {}

  let { props }: Props = $props();
</script>

<Accordion.Root type={props.type === "single" ? "single" : "multiple"} class="w-full">
  {#each props.items ?? [] as item, i}
    <Accordion.Item value="item-{i}">
      <Accordion.Trigger>{item.title}</Accordion.Trigger>
      <Accordion.Content>
        <p class="text-muted-foreground">{item.content}</p>
      </Accordion.Content>
    </Accordion.Item>
  {/each}
</Accordion.Root>

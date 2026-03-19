<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import * as Accordion from "./ui/accordion/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Accordion">> {}

  let { props }: Props = $props();

  const items = $derived(props.items ?? []);
</script>

<Accordion.Root type={props.type ?? "single"} class="w-full">
  {#each items as item, i}
    <Accordion.Item value={`item-${i}`}>
      <Accordion.Trigger>{item.title}</Accordion.Trigger>
      <Accordion.Content>{item.content}</Accordion.Content>
    </Accordion.Item>
  {/each}
</Accordion.Root>

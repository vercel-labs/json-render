<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "./ui/popover/index.js";
  import { Button } from "./ui/button/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Popover">> {}

  let { props }: Props = $props();
</script>

<Popover>
  <PopoverTrigger>
    {#snippet child({ props: triggerProps })}
      <Button variant="outline" {...triggerProps}>{props.trigger}</Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent class="w-64 text-sm">{props.content}</PopoverContent>
</Popover>

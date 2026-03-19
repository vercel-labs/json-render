<script lang="ts">
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "./ui/collapsible/index.js";
  import { Button } from "./ui/button/index.js";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";

  interface Props extends BaseComponentProps<ShadcnProps<"Collapsible">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  let open = $state(untrack(() => props.defaultOpen ?? false));
</script>

<Collapsible bind:open class="w-full rounded-md border border-border">
  <CollapsibleTrigger>
    {#snippet child({ props: triggerProps })}
      <Button
        variant="ghost"
        class="flex w-full items-center justify-between px-4 py-2 text-sm font-medium"
        {...triggerProps}
      >
        <span>{props.title}</span>
        <ChevronDown class={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
    {/snippet}
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div class="px-4 pb-3 pt-1">{@render children?.()}</div>
  </CollapsibleContent>
</Collapsible>

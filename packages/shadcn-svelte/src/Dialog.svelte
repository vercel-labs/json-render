<script lang="ts">
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { getStateValue } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "./ui/dialog/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Dialog">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const openState = getStateValue(untrack(() => props.openPath));
  const open = $derived(Boolean(openState.current));

  function handleOpenChange(next: boolean) {
    openState.current = next;
  }
</script>

<Dialog {open} onOpenChange={handleOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{props.title}</DialogTitle>
      {#if props.description}
        <DialogDescription>{props.description}</DialogDescription>
      {/if}
    </DialogHeader>
    {@render children?.()}
  </DialogContent>
</Dialog>

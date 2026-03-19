<script lang="ts">
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { getStateValue } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
  } from "./ui/drawer/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Drawer">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const openState = getStateValue(untrack(() => props.openPath));
  const open = $derived(Boolean(openState.current));

  function handleOpenChange(next: boolean) {
    openState.current = next;
  }
</script>

<Drawer {open} onOpenChange={handleOpenChange}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>{props.title}</DrawerTitle>
      {#if props.description}
        <DrawerDescription>{props.description}</DrawerDescription>
      {/if}
    </DrawerHeader>
    <div class="px-4 pb-4">
      {@render children?.()}
    </div>
  </DrawerContent>
</Drawer>

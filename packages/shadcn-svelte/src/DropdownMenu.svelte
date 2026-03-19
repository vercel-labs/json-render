<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "./ui/dropdown-menu/index.js";
  import { Button } from "./ui/button/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"DropdownMenu">> {}

  let { props, bindings, emit }: Props = $props();

  const valueBound = getBoundProp<string>(
    () => props.value ?? undefined,
    () => bindings?.value,
  );

  function select(value: string) {
    valueBound.current = value;
    emit("select");
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props: triggerProps })}
      <Button variant="outline" {...triggerProps}>{props.label}</Button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {#each props.items ?? [] as item}
      <DropdownMenuItem onclick={() => select(item.value)}>
        {item.label}
      </DropdownMenuItem>
    {/each}
  </DropdownMenuContent>
</DropdownMenu>

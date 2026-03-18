<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

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

<details class="relative inline-block">
  <summary class="cursor-pointer rounded-md border px-3 py-1.5 text-sm list-none">{props.label}</summary>
  <div class="absolute left-0 top-full z-40 mt-2 min-w-40 rounded-md border bg-popover p-1 shadow-md">
    {#each props.items ?? [] as item}
      <button
        type="button"
        class="block w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-accent"
        onclick={() => select(item.value)}
      >
        {item.label}
      </button>
    {/each}
  </div>
</details>

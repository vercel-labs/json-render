<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Popover">> {}

  let { props }: Props = $props();
</script>

<details class="relative inline-block">
  <summary class="cursor-pointer rounded-md border px-3 py-1.5 text-sm list-none">{props.trigger}</summary>
  <div class="absolute left-0 top-full z-40 mt-2 w-64 rounded-md border bg-popover p-3 text-sm shadow-md">
    {props.content}
  </div>
</details>

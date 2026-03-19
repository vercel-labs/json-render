<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Link">> {}

  let { props, on }: Props = $props();

  function handleClick(event: MouseEvent) {
    const press = on("press");
    if (press.shouldPreventDefault) event.preventDefault();
    press.emit();
  }
</script>

<a
  href={props.href ?? "#"}
  class="text-primary text-sm font-medium underline-offset-4 hover:underline"
  onclick={handleClick}
>
  {props.label}
</a>

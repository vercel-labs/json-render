<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Toggle">> {}

  let { props, bindings, emit }: Props = $props();

  let localPressed = $state(props.pressed ?? false);

  function binding() {
    return getBoundProp<boolean>(
      () => props.pressed ?? undefined,
      () => bindings?.pressed,
    );
  }

  const pressed = $derived(binding().current ?? localPressed);

  function toggle() {
    const next = !pressed;
    localPressed = next;
    binding().current = next;
    emit("change");
  }
</script>

<button
  type="button"
  class={`rounded-md border px-3 py-1.5 text-sm ${pressed ? "bg-primary text-primary-foreground" : "bg-background"}`}
  onclick={toggle}
>
  {props.label}
</button>

<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Toggle">> {}

  let { props, bindings, emit }: Props = $props();

  let localPressed = $state(untrack(() => props.pressed ?? false));

  const bound = getBoundProp<boolean>(
    () => props.pressed ?? undefined,
    () => bindings?.pressed,
  );

  const pressed = $derived(bound.current ?? localPressed);

  function toggle() {
    const next = !pressed;
    localPressed = next;
    bound.current = next;
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

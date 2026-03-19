<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Toggle } from "./ui/toggle/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Toggle">> {}

  let { props, bindings, emit }: Props = $props();

  let localPressed = $state(untrack(() => props.pressed ?? false));

  const bound = getBoundProp<boolean>(
    () => props.pressed ?? undefined,
    () => bindings?.pressed,
  );

  const pressed = $derived(bound.current ?? localPressed);

  function handleChange(next: boolean) {
    localPressed = next;
    bound.current = next;
    emit("change");
  }
</script>

<Toggle {pressed} onPressedChange={handleChange}>{props.label}</Toggle>

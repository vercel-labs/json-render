<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Button } from "./ui/button/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Button">> {}

  let { props, emit }: Props = $props();

  const rawVariant = $derived((props.variant ?? "primary") as string);
  const variant = $derived(
    rawVariant === "danger" || rawVariant === "destructive"
      ? "destructive"
      : rawVariant === "secondary" || rawVariant === "outline" || rawVariant === "ghost"
        ? "secondary"
        : "default",
  );
</script>

<Button {variant} disabled={props.disabled ?? false} onclick={() => emit("press")}>
  {props.label}
</Button>

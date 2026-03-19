<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Heading">> {}

  let { props }: Props = $props();

  const level = $derived(props.level ?? "h2");
  const className = $derived(
    level === "h1"
      ? "text-3xl font-bold tracking-tight"
      : level === "h2"
        ? "text-2xl font-semibold tracking-tight"
        : level === "h3"
          ? "text-xl font-semibold"
          : "text-lg font-medium",
  );
</script>

<svelte:element this={level} class={className}>{props.text}</svelte:element>

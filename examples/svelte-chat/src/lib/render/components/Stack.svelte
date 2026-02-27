<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    direction?: "horizontal" | "vertical" | null;
    gap?: "sm" | "md" | "lg" | null;
    wrap?: boolean | null;
  }> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const gapClass = $derived(
    { sm: "gap-2", md: "gap-4", lg: "gap-6" }[props.gap ?? "md"] ?? "gap-4"
  );
  const dirClass = $derived(
    props.direction === "horizontal" ? "flex-row" : "flex-col"
  );
  const wrapClass = $derived(props.wrap ? "flex-wrap" : "");
</script>

<div class="flex {dirClass} {wrapClass} {gapClass}">
  {#if children}
    {@render children()}
  {/if}
</div>

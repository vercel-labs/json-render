<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Grid">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const colsMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  const gapMap: Record<string, string> = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  const n = $derived(Math.max(1, Math.min(6, props.columns ?? 1)));
</script>

<div class={`grid ${colsMap[n] ?? "grid-cols-1"} ${gapMap[props.gap ?? "md"] ?? "gap-3"}`}>
  {@render children?.()}
</div>

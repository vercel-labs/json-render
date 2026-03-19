<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Stack">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const gapMap: Record<string, string> = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  const alignMap: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const justifyMap: Record<string, string> = {
    start: "",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
  };
</script>

<div
  class={`flex ${props.direction === "horizontal" ? "flex-row flex-wrap" : "flex-col"} ${gapMap[props.gap ?? "md"] ?? "gap-3"} ${alignMap[props.align ?? "start"] ?? "items-start"} ${justifyMap[props.justify ?? "start"] ?? ""}`}
>
  {@render children?.()}
</div>

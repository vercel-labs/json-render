<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    gap?: number;
    padding?: number;
    direction?: "vertical" | "horizontal";
    align?: "start" | "center" | "end";
  }> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();
  let horizontal = $derived(props.direction === "horizontal");
</script>

<div
  style="
    display: flex;
    flex-direction: {horizontal ? 'row' : 'column'};
    gap: {props.gap ?? 0}px;
    padding: {props.padding ?? 0}px;
    align-items: {props.align === 'start'
    ? 'flex-start'
    : props.align === 'end'
      ? 'flex-end'
      : horizontal
        ? 'center'
        : 'stretch'};
  ">
  {#if children}
    {@render children()}
  {/if}
</div>

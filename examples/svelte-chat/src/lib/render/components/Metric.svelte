<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { TrendingUp, TrendingDown, Minus } from "lucide-svelte";

  interface Props extends BaseComponentProps<{
    label: string;
    value: string;
    detail?: string | null;
    trend?: "up" | "down" | "neutral" | null;
  }> {}

  let { props }: Props = $props();

  const trendColor = $derived(
    props.trend === "up"
      ? "text-green-500"
      : props.trend === "down"
        ? "text-red-500"
        : "text-muted-foreground"
  );
</script>

<div class="flex flex-col gap-1">
  <p class="text-sm text-muted-foreground">{props.label}</p>
  <div class="flex items-center gap-2">
    <span class="text-2xl font-bold">{props.value}</span>
    {#if props.trend}
      {#if props.trend === "up"}
        <TrendingUp class="h-4 w-4 {trendColor}" />
      {:else if props.trend === "down"}
        <TrendingDown class="h-4 w-4 {trendColor}" />
      {:else}
        <Minus class="h-4 w-4 {trendColor}" />
      {/if}
    {/if}
  </div>
  {#if props.detail}
    <p class="text-xs text-muted-foreground">{props.detail}</p>
  {/if}
</div>

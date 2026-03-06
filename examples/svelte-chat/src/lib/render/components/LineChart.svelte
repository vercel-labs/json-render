<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    title?: string | null;
    data: Array<Record<string, unknown>>;
    xKey: string;
    yKey: string;
    aggregate?: "sum" | "count" | "avg" | null;
    color?: string | null;
    height?: number | null;
  }> {}

  let { props }: Props = $props();

  const rawData = $derived(props.data);
  const rawItems = $derived<Array<Record<string, unknown>>>(
    Array.isArray(rawData)
      ? rawData
      : Array.isArray((rawData as Record<string, unknown>)?.data)
        ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
        : []
  );

  const processedData = $derived(() => {
    if (rawItems.length === 0) return [];
    
    const { xKey, yKey, aggregate } = props;
    
    if (!aggregate) {
      return rawItems.map((item) => ({
        label: String(item[xKey] ?? ""),
        value: typeof item[yKey] === "number" ? item[yKey] : parseFloat(String(item[yKey])) || 0,
      }));
    }

    const groups = new Map<string, Array<Record<string, unknown>>>();
    for (const item of rawItems) {
      const groupKey = String(item[xKey] ?? "unknown");
      const group = groups.get(groupKey) ?? [];
      group.push(item);
      groups.set(groupKey, group);
    }

    const aggregated: Array<{ label: string; value: number }> = [];
    for (const [key, group] of Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      let value: number;
      if (aggregate === "count") {
        value = group.length;
      } else if (aggregate === "sum") {
        value = group.reduce((sum, item) => {
          const v = item[yKey];
          return sum + (typeof v === "number" ? v : parseFloat(String(v)) || 0);
        }, 0);
      } else {
        const sum = group.reduce((s, item) => {
          const v = item[yKey];
          return s + (typeof v === "number" ? v : parseFloat(String(v)) || 0);
        }, 0);
        value = group.length > 0 ? sum / group.length : 0;
      }
      aggregated.push({ label: key, value });
    }
    return aggregated;
  });

  const chartData = $derived(processedData());
  const maxValue = $derived(Math.max(...chartData.map(d => d.value), 1));
  const minValue = $derived(Math.min(...chartData.map(d => d.value), 0));
  const chartColor = $derived(props.color ?? "var(--chart-1)");
  const height = $derived(props.height ?? 200);
  
  const points = $derived(() => {
    if (chartData.length === 0) return "";
    const range = maxValue - minValue || 1;
    return chartData.map((d, i) => {
      const x = (i / (chartData.length - 1 || 1)) * 100;
      const y = 100 - ((d.value - minValue) / range) * 100;
      return `${x},${y}`;
    }).join(" ");
  });
</script>

<div class="w-full">
  {#if props.title}
    <p class="text-sm font-medium mb-2">{props.title}</p>
  {/if}
  
  {#if chartData.length === 0}
    <div class="text-center py-4 text-muted-foreground">No data available</div>
  {:else}
    <div class="relative" style="height: {height}px">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
        <polyline
          points={points()}
          fill="none"
          stroke={chartColor}
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <div class="flex justify-between text-xs text-muted-foreground mt-1">
        {#each chartData.filter((_, i) => i === 0 || i === chartData.length - 1 || i === Math.floor(chartData.length / 2)) as item}
          <span>{item.label}</span>
        {/each}
      </div>
    </div>
  {/if}
</div>

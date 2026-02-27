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
    if (rawItems.length === 0) return { items: [], valueKey: props.yKey };
    
    const { xKey, yKey, aggregate } = props;
    
    if (!aggregate) {
      const formatted = rawItems.map((item) => ({
        label: String(item[xKey] ?? ""),
        value: typeof item[yKey] === "number" ? item[yKey] : parseFloat(String(item[yKey])) || 0,
      }));
      return { items: formatted, valueKey: yKey };
    }

    const groups = new Map<string, Array<Record<string, unknown>>>();
    for (const item of rawItems) {
      const groupKey = String(item[xKey] ?? "unknown");
      const group = groups.get(groupKey) ?? [];
      group.push(item);
      groups.set(groupKey, group);
    }

    const valueKey = aggregate === "count" ? "count" : yKey;
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

    return { items: aggregated, valueKey };
  });

  const chartData = $derived(processedData());
  const maxValue = $derived(Math.max(...chartData.items.map(d => d.value), 1));
  const chartColor = $derived(props.color ?? "var(--chart-1)");
</script>

<div class="w-full">
  {#if props.title}
    <p class="text-sm font-medium mb-2">{props.title}</p>
  {/if}
  
  {#if chartData.items.length === 0}
    <div class="text-center py-4 text-muted-foreground">No data available</div>
  {:else}
    <div class="space-y-2" style="height: {props.height ?? 200}px">
      {#each chartData.items as item}
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground w-16 truncate">{item.label}</span>
          <div class="flex-1 h-6 bg-muted rounded overflow-hidden">
            <div 
              class="h-full rounded transition-all"
              style="width: {(item.value / maxValue) * 100}%; background-color: {chartColor}"
            ></div>
          </div>
          <span class="text-xs font-medium w-12 text-right">{item.value.toLocaleString()}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

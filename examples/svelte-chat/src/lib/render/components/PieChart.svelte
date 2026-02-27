<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    title?: string | null;
    data: Array<Record<string, unknown>>;
    nameKey: string;
    valueKey: string;
    height?: number | null;
  }> {}

  let { props }: Props = $props();

  const PIE_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  const rawData = $derived(props.data);
  const items = $derived<Array<Record<string, unknown>>>(
    Array.isArray(rawData)
      ? rawData
      : Array.isArray((rawData as Record<string, unknown>)?.data)
        ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
        : []
  );

  const chartData = $derived(
    items.map((item, i) => ({
      name: String(item[props.nameKey] ?? `Segment ${i + 1}`),
      value: typeof item[props.valueKey] === "number"
        ? item[props.valueKey] as number
        : parseFloat(String(item[props.valueKey])) || 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
  );

  const total = $derived(chartData.reduce((sum, d) => sum + d.value, 0));

  const segments = $derived(() => {
    let startAngle = 0;
    return chartData.map((d) => {
      const angle = (d.value / (total || 1)) * 360;
      const segment = {
        ...d,
        startAngle,
        endAngle: startAngle + angle,
        percentage: Math.round((d.value / (total || 1)) * 100),
      };
      startAngle += angle;
      return segment;
    });
  });

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }
</script>

<div class="w-full">
  {#if props.title}
    <p class="text-sm font-medium mb-2">{props.title}</p>
  {/if}
  
  {#if items.length === 0}
    <div class="text-center py-4 text-muted-foreground">No data available</div>
  {:else}
    <div class="flex items-center gap-4" style="height: {props.height ?? 200}px">
      <svg viewBox="0 0 100 100" class="h-full aspect-square">
        {#each segments() as seg}
          {#if seg.endAngle - seg.startAngle >= 1}
            <path
              d={describeArc(50, 50, 35, seg.startAngle, seg.endAngle)}
              fill="none"
              stroke={seg.color}
              stroke-width="15"
            />
          {/if}
        {/each}
      </svg>
      <div class="flex flex-col gap-1 text-sm">
        {#each segments() as seg}
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" style="background-color: {seg.color}"></span>
            <span class="text-muted-foreground">{seg.name}</span>
            <span class="font-medium">{seg.percentage}%</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

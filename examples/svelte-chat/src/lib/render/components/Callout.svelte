<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { Info, Lightbulb, AlertTriangle, Star } from "lucide-svelte";

  interface Props extends BaseComponentProps<{
    type?: "info" | "tip" | "warning" | "important" | null;
    title?: string | null;
    content: string;
  }> {}

  let { props }: Props = $props();

  const configs = {
    info: {
      border: "border-l-blue-500",
      bg: "bg-blue-500/5",
      iconColor: "text-blue-500",
    },
    tip: {
      border: "border-l-emerald-500",
      bg: "bg-emerald-500/5",
      iconColor: "text-emerald-500",
    },
    warning: {
      border: "border-l-amber-500",
      bg: "bg-amber-500/5",
      iconColor: "text-amber-500",
    },
    important: {
      border: "border-l-purple-500",
      bg: "bg-purple-500/5",
      iconColor: "text-purple-500",
    },
  };

  const config = $derived(configs[props.type ?? "info"] ?? configs.info);
</script>

<div class="border-l-4 {config.border} {config.bg} rounded-r-lg p-4">
  <div class="flex items-start gap-3">
    {#if props.type === "tip"}
      <Lightbulb class="h-5 w-5 mt-0.5 shrink-0 {config.iconColor}" />
    {:else if props.type === "warning"}
      <AlertTriangle class="h-5 w-5 mt-0.5 shrink-0 {config.iconColor}" />
    {:else if props.type === "important"}
      <Star class="h-5 w-5 mt-0.5 shrink-0 {config.iconColor}" />
    {:else}
      <Info class="h-5 w-5 mt-0.5 shrink-0 {config.iconColor}" />
    {/if}
    <div class="flex-1 min-w-0">
      {#if props.title}
        <p class="font-semibold text-sm mb-1">{props.title}</p>
      {/if}
      <p class="text-sm text-muted-foreground">{props.content}</p>
    </div>
  </div>
</div>

<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    items: Array<{
      title: string;
      description?: string | null;
      date?: string | null;
      status?: "completed" | "current" | "upcoming" | null;
    }>;
  }> {}

  let { props }: Props = $props();

  function getDotColor(status: string | null | undefined) {
    if (status === "completed") return "bg-emerald-500";
    if (status === "current") return "bg-blue-500";
    return "bg-muted-foreground/30";
  }
</script>

<div class="relative pl-8">
  <div class="absolute left-[5.5px] top-3 bottom-3 w-px bg-border"></div>
  <div class="flex flex-col gap-6">
    {#each props.items ?? [] as item}
      <div class="relative">
        <div class="absolute -left-8 top-0.5 h-3 w-3 rounded-full {getDotColor(item.status)} ring-2 ring-background"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-medium text-sm">{item.title}</p>
            {#if item.date}
              <span class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {item.date}
              </span>
            {/if}
          </div>
          {#if item.description}
            <p class="text-sm text-muted-foreground mt-1">{item.description}</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Progress } from "./ui/progress/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Progress">> {}

  let { props }: Props = $props();

  const max = $derived(props.max ?? 100);
  const percent = $derived(Math.max(0, Math.min(100, (props.value / max) * 100)));
</script>

<div class="space-y-1">
  {#if props.label}
    <div class="text-sm text-muted-foreground">{props.label}</div>
  {/if}
  <Progress value={percent} />
</div>

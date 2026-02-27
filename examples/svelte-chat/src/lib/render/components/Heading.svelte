<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    text: string;
    level?: "h1" | "h2" | "h3" | "h4" | null;
  }> {}

  let { props }: Props = $props();

  const level = $derived(props.level ?? "h2");
</script>

{#if level === "h1"}
  <h1 class="text-3xl font-bold tracking-tight">{props.text}</h1>
{:else if level === "h2"}
  <h2 class="text-2xl font-semibold tracking-tight">{props.text}</h2>
{:else if level === "h3"}
  <h3 class="text-xl font-semibold">{props.text}</h3>
{:else}
  <h4 class="text-lg font-medium">{props.text}</h4>
{/if}

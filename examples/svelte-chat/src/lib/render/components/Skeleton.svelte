<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    width?: string | null;
    height?: string | null;
  }> {}

  let { props }: Props = $props();
</script>

<div 
  class="animate-pulse rounded-md bg-muted {props.width ?? 'w-full'} {props.height ?? 'h-4'}"
></div>

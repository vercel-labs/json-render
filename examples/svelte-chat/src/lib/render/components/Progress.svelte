<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { Progress } from "$lib/components/ui/progress";

  interface Props extends BaseComponentProps<{
    value: number;
    max?: number | null;
  }> {}

  let { props }: Props = $props();
</script>

<Progress value={props.value} max={props.max ?? 100} />

<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { Badge } from "$lib/components/ui/badge";

  interface Props extends BaseComponentProps<{
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | null;
  }> {}

  let { props }: Props = $props();
</script>

<Badge variant={props.variant ?? "default"}>{props.text}</Badge>

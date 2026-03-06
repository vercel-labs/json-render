<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { Button } from "$lib/components/ui/button";

  interface Props extends BaseComponentProps<{
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | null;
    size?: "default" | "sm" | "lg" | null;
    disabled?: boolean | null;
  }> {}

  let { props, emit }: Props = $props();
</script>

<Button
  variant={props.variant ?? "default"}
  size={props.size ?? "default"}
  disabled={props.disabled ?? false}
  onclick={() => emit("press")}
>
  {props.label}
</Button>

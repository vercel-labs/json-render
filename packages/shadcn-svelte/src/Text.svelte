<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Text">> {}

  let { props }: Props = $props();

  const className = $derived(
    props.variant === "caption"
      ? "text-xs text-muted-foreground"
      : props.variant === "muted"
        ? "text-sm text-muted-foreground"
        : props.variant === "lead"
          ? "text-lg text-foreground"
          : props.variant === "code"
            ? "rounded bg-muted px-1 py-0.5 font-mono text-sm"
            : "text-sm text-foreground",
  );
</script>

<p class={className}>{props.text}</p>

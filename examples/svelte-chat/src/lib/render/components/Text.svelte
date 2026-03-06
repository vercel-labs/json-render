<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    content: string;
    muted?: boolean | null;
  }> {}

  let { props }: Props = $props();
</script>

<p class={props.muted ? "text-muted-foreground" : ""}>
  {props.content}
</p>

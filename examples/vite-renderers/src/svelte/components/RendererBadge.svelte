<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{ renderer: string }> {}

  let { props }: Props = $props();
</script>

<span class="json-render-renderer-badge">
  <span class="json-render-renderer-dot"></span>
  {props.renderer === "vue"
    ? "Rendered with Vue"
    : props.renderer === "react"
      ? "Rendered with React"
      : "Rendered with Svelte"}
</span>

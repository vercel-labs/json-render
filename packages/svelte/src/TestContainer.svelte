<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "./catalog-types.js";

  interface Props extends BaseComponentProps<{ title?: string }> {
    children?: Snippet;
  }

  let { props, children, emit, bindings, loading }: Props = $props();
</script>

<div class="test-container" data-loading={loading}>
  {#if props.title}
    <h2>{props.title}</h2>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>

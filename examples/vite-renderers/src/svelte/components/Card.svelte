<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    title?: string;
    subtitle?: string;
  }> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();
</script>

<div
  style="
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  ">
  {#if props.title}
    <h2
      style="
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 4px 0;
      ">
      {props.title}
    </h2>
  {/if}
  {#if props.subtitle}
    <p
      style="
        font-size: 13px;
        color: #6b7280;
        margin: 0 0 12px 0;
      ">
      {props.subtitle}
    </p>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>

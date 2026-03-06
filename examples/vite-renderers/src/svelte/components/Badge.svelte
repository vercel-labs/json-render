<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    label: string;
    color?: string;
  }> {}

  let { props }: Props = $props();
</script>

<span
  style="
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    background-color: {props.color ? `${props.color}20` : '#e0f2fe'};
    color: {props.color ?? '#0369a1'};
    border: 1px solid {props.color ? `${props.color}40` : '#bae6fd'};
  ">
  {props.label}
</span>

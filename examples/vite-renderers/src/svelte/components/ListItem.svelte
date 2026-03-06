<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    title: string;
    completed?: boolean;
  }> {}

  let { props, emit }: Props = $props();
</script>

<button
  type="button"
  onclick={() => emit("press")}
  style="
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    background-color: {props.completed ? '#f0fdf4' : '#f9fafb'};
    border: 1px solid {props.completed ? '#bbf7d0' : '#e5e7eb'};
  ">
  <div
    style="
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid {props.completed ? '#16a34a' : '#d1d5db'};
      background-color: {props.completed ? '#16a34a' : 'transparent'};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      flex-shrink: 0;
    ">
    {props.completed ? "✓" : ""}
  </div>
  <span
    style="
      font-size: 14px;
      color: {props.completed ? '#6b7280' : '#111827'};
      text-decoration: {props.completed ? 'line-through' : 'none'};
    ">
    {props.title}
  </span>
</button>

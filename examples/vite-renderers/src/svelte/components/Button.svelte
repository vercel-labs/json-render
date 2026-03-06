<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    label: string;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
  }> {}

  let { props, emit }: Props = $props();

  let backgroundColor = $derived(
    props.variant === "danger"
      ? "#fee2e2"
      : props.variant === "secondary"
        ? "#f3f4f6"
        : "#3b82f6",
  );
  let textColor = $derived(
    props.variant === "danger"
      ? "#dc2626"
      : props.variant === "secondary"
        ? "#374151"
        : "white",
  );
</script>

<button
  disabled={props.disabled}
  onclick={() => emit("press")}
  style="
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: {props.disabled ? 'not-allowed' : 'pointer'};
    font-weight: 500;
    font-size: 14px;
    transition: background 0.15s;
    opacity: {props.disabled ? '0.5' : '1'};
    background-color: {backgroundColor};
    color: {textColor};
  ">
  {props.label}
</button>

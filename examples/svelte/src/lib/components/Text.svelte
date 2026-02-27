<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    content: string;
    size?: "sm" | "md" | "lg" | "xl";
    weight?: "normal" | "medium" | "bold";
    color?: string;
  }> {}

  let { props }: Props = $props();

  const sizeMap: Record<string, string> = {
    sm: "12px",
    md: "14px",
    lg: "16px",
    xl: "24px",
  };

  const weightMap: Record<string, string> = {
    normal: "400",
    medium: "500",
    bold: "700",
  };
</script>

<span
  style="
    font-size: {sizeMap[props.size ?? 'md'] ?? '14px'};
    font-weight: {weightMap[props.weight ?? 'normal'] ?? '400'};
    color: {props.color ?? '#111827'};
  ">
  {String(props.content ?? "")}
</span>

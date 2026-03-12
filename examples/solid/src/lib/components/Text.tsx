import type { BaseComponentProps } from "@json-render/solid";

interface TextProps {
  content: string;
  size?: "sm" | "md" | "lg" | "xl";
  weight?: "normal" | "medium" | "bold";
  color?: string;
}

const sizeMap: Record<string, string> = {
  sm: "12px",
  md: "14px",
  lg: "18px",
  xl: "24px",
};

const weightMap: Record<string, string> = {
  normal: "400",
  medium: "500",
  bold: "700",
};

export function Text(renderProps: BaseComponentProps<TextProps>) {
  return (
    <span
      style={{
        "font-size": sizeMap[renderProps.props.size ?? "md"],
        "font-weight": weightMap[renderProps.props.weight ?? "normal"],
        color: renderProps.props.color,
      }}
    >
      {String(renderProps.props.content ?? "")}
    </span>
  );
}

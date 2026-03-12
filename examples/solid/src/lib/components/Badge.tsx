import type { BaseComponentProps } from "@json-render/solid";

interface BadgeProps {
  label: string;
  color?: string;
}

export function Badge(renderProps: BaseComponentProps<BadgeProps>) {
  const color = () => renderProps.props.color ?? "#6b7280";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        "border-radius": "9999px",
        "font-size": "13px",
        "font-weight": "500",
        "background-color": `${color()}20`,
        color: color(),
        border: `1px solid ${color()}40`,
      }}
    >
      {renderProps.props.label}
    </span>
  );
}

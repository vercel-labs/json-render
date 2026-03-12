import type { BaseComponentProps } from "@json-render/solid";

interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

const variantStyles: Record<string, Record<string, string>> = {
  primary: {
    background: "#2563eb",
    color: "#ffffff",
    border: "1px solid #2563eb",
  },
  secondary: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
  },
  danger: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "1px solid #fca5a5",
  },
};

export function Button(renderProps: BaseComponentProps<ButtonProps>) {
  const variant = () => renderProps.props.variant ?? "primary";

  return (
    <button
      disabled={renderProps.props.disabled}
      onClick={() => renderProps.emit("press")}
      style={{
        padding: "8px 16px",
        "border-radius": "8px",
        "font-size": "14px",
        "font-weight": "500",
        cursor: renderProps.props.disabled ? "not-allowed" : "pointer",
        opacity: renderProps.props.disabled ? "0.5" : "1",
        ...variantStyles[variant()],
      }}
    >
      {renderProps.props.label}
    </button>
  );
}

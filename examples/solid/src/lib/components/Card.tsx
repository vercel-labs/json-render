import type { BaseComponentProps } from "@json-render/solid";

interface CardProps {
  title?: string;
  subtitle?: string;
}

export function Card(renderProps: BaseComponentProps<CardProps>) {
  return (
    <div
      style={{
        background: "#ffffff",
        "border-radius": "12px",
        border: "1px solid #e5e7eb",
        padding: "20px",
        "box-shadow": "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {renderProps.props.title && (
        <h2
          style={{
            "font-size": "18px",
            "font-weight": "600",
            "margin-bottom": renderProps.props.subtitle ? "4px" : "16px",
          }}
        >
          {renderProps.props.title}
        </h2>
      )}
      {renderProps.props.subtitle && (
        <p
          style={{
            "font-size": "14px",
            color: "#6b7280",
            "margin-bottom": "16px",
          }}
        >
          {renderProps.props.subtitle}
        </p>
      )}
      {renderProps.children}
    </div>
  );
}

import type { BaseComponentProps } from "@json-render/solid";

interface ListItemProps {
  title: string;
  description?: string;
  completed?: boolean;
}

export function ListItem(renderProps: BaseComponentProps<ListItemProps>) {
  return (
    <div
      onClick={() => renderProps.emit("press")}
      style={{
        display: "flex",
        "align-items": "center",
        gap: "10px",
        padding: "10px 12px",
        "border-radius": "8px",
        border: "1px solid #e5e7eb",
        cursor: "pointer",
        "user-select": "none",
        background: renderProps.props.completed ? "#f0fdf4" : "#ffffff",
      }}
    >
      <span
        style={{
          width: "22px",
          height: "22px",
          "border-radius": "6px",
          border: renderProps.props.completed
            ? "2px solid #22c55e"
            : "2px solid #d1d5db",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "font-size": "13px",
          color: "#22c55e",
          "flex-shrink": "0",
        }}
      >
        {renderProps.props.completed ? "\u2713" : ""}
      </span>
      <span
        style={{
          "text-decoration": renderProps.props.completed
            ? "line-through"
            : "none",
          color: renderProps.props.completed ? "#9ca3af" : "#111827",
        }}
      >
        {renderProps.props.title}
      </span>
    </div>
  );
}

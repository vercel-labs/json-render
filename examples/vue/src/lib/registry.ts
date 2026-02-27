import { h } from "vue";
import type { Components } from "@json-render/vue";
import { useBoundProp } from "@json-render/vue";
import type { AppCatalog } from "./catalog";

export const components: Components<AppCatalog> = {
  Stack: ({ props, children }) => {
    const isHorizontal = props.direction === "horizontal";
    return h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: isHorizontal ? "row" : "column",
          gap: props.gap ? `${props.gap}px` : undefined,
          padding: props.padding ? `${props.padding}px` : undefined,
          alignItems: props.align ?? (isHorizontal ? "center" : "stretch"),
        },
      },
      children,
    );
  },

  Card: ({ props, children }) =>
    h(
      "div",
      {
        style: {
          backgroundColor: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        },
      },
      [
        props.title &&
          h("div", { style: { marginBottom: "4px" } }, [
            h(
              "h2",
              {
                style: {
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                },
              },
              props.title,
            ),
          ]),
        props.subtitle &&
          h(
            "p",
            {
              style: {
                fontSize: "13px",
                color: "#6b7280",
                margin: "0 0 12px 0",
              },
            },
            props.subtitle,
          ),
        children,
      ],
    ),

  Text: ({ props }) => {
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
    return h(
      "span",
      {
        style: {
          fontSize: sizeMap[props.size ?? "md"] ?? "14px",
          fontWeight: weightMap[props.weight ?? "normal"] ?? "400",
          color: props.color ?? "#111827",
        },
      },
      String(props.content ?? ""),
    );
  },

  Button: ({ props, emit }) =>
    h(
      "button",
      {
        disabled: props.disabled,
        onClick: () => emit("press"),
        style: {
          padding: "8px 16px",
          borderRadius: "8px",
          border: "none",
          cursor: props.disabled ? "not-allowed" : "pointer",
          fontWeight: "500",
          fontSize: "14px",
          transition: "background 0.15s",
          opacity: props.disabled ? "0.5" : "1",
          backgroundColor:
            props.variant === "danger"
              ? "#fee2e2"
              : props.variant === "secondary"
                ? "#f3f4f6"
                : "#3b82f6",
          color:
            props.variant === "danger"
              ? "#dc2626"
              : props.variant === "secondary"
                ? "#374151"
                : "white",
        },
      },
      props.label,
    ),

  Badge: ({ props }) =>
    h(
      "span",
      {
        style: {
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "999px",
          fontSize: "13px",
          fontWeight: "500",
          backgroundColor: props.color ? `${props.color}20` : "#e0f2fe",
          color: props.color ?? "#0369a1",
          border: `1px solid ${props.color ? `${props.color}40` : "#bae6fd"}`,
        },
      },
      props.label,
    ),

  Input: ({ props, bindings }) => {
    const [value, setValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    return h("input", {
      value: value ?? "",
      placeholder: props.placeholder as string | undefined,
      onInput: (e: Event) => setValue((e.target as HTMLInputElement).value),
      style: {
        padding: "8px 12px",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        fontSize: "14px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
      },
    });
  },

  ListItem: ({ props, emit }) =>
    h(
      "div",
      {
        onClick: () => emit("press"),
        style: {
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          backgroundColor: props.completed ? "#f0fdf4" : "#f9fafb",
          border: `1px solid ${props.completed ? "#bbf7d0" : "#e5e7eb"}`,
        },
      },
      [
        h(
          "div",
          {
            style: {
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border: `2px solid ${props.completed ? "#16a34a" : "#d1d5db"}`,
              backgroundColor: props.completed ? "#16a34a" : "transparent",
              flexShrink: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: "white",
            },
          },
          props.completed ? "✓" : "",
        ),
        h(
          "span",
          {
            style: {
              fontSize: "14px",
              color: props.completed ? "#6b7280" : "#111827",
              textDecoration: props.completed ? "line-through" : "none",
            },
          },
          props.title,
        ),
      ],
    ),
};

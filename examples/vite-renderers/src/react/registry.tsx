import type { Components } from "@json-render/react";
import type { AppCatalog } from "./catalog";

export const components: Components<AppCatalog> = {
  Stack: ({ props, children }) => (
    <div
      className={[
        "json-render-stack",
        props.direction === "horizontal" && "json-render-stack--horizontal",
        props.align && `json-render-stack--align-${props.align}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        gap: props.gap ? `${props.gap}px` : undefined,
        padding: props.padding ? `${props.padding}px` : undefined,
      }}
    >
      {children}
    </div>
  ),

  Card: ({ props, children }) => (
    <div className="json-render-card">
      {props.title && (
        <div className="json-render-card-title-wrap">
          <h2 className="json-render-card-title">{props.title}</h2>
        </div>
      )}
      {props.subtitle && (
        <p className="json-render-card-subtitle">{props.subtitle}</p>
      )}
      {children}
    </div>
  ),

  Text: ({ props }) => (
    <span
      className={[
        "json-render-text",
        props.size && props.size !== "md" && `json-render-text--${props.size}`,
        props.weight &&
          props.weight !== "normal" &&
          `json-render-text--${props.weight}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={props.color ? { color: props.color } : undefined}
    >
      {String(props.content ?? "")}
    </span>
  ),

  Button: ({ props, emit }) => (
    <button
      disabled={props.disabled}
      onClick={() => emit("press")}
      className={[
        "json-render-button",
        props.variant && `json-render-button--${props.variant}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {props.label}
    </button>
  ),

  Badge: ({ props }) => (
    <span
      className="json-render-badge"
      style={
        props.color
          ? {
              backgroundColor: `${props.color}20`,
              color: props.color,
              borderColor: `${props.color}40`,
            }
          : undefined
      }
    >
      {props.label}
    </span>
  ),

  ListItem: ({ props, emit }) => (
    <div
      onClick={() => emit("press")}
      className={[
        "json-render-list-item",
        props.completed && "json-render-list-item--done",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "json-render-list-item-check",
          props.completed && "json-render-list-item-check--done",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {props.completed ? "✓" : ""}
      </div>
      <span
        className={[
          "json-render-list-item-text",
          props.completed && "json-render-list-item-text--done",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {props.title}
      </span>
    </div>
  ),

  RendererBadge: ({ props }) => (
    <span className="json-render-renderer-badge">
      <span className="json-render-renderer-dot" />
      {props.renderer === "vue" ? "Rendered with Vue" : "Rendered with React"}
    </span>
  ),

  RendererTabs: ({ props, emit }) => (
    <div className="json-render-renderer-tabs-wrapper">
      <span className="json-render-renderer-tabs-label">Render</span>
      <div className="json-render-renderer-tabs">
        <button
          onClick={() => emit("pressVue")}
          className={[
            "json-render-renderer-tab",
            props.renderer === "vue" && "json-render-renderer-tab--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          Vue
        </button>
        <button
          onClick={() => emit("pressReact")}
          className={[
            "json-render-renderer-tab",
            props.renderer === "react" && "json-render-renderer-tab--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          React
        </button>
      </div>
    </div>
  ),
};

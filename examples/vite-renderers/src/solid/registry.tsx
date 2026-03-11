import type { Components } from "@json-render/solid";
import type { AppCatalog } from "./catalog";

export const components: Components<AppCatalog> = {
  Stack: (renderProps) => (
    <div
      class={[
        "json-render-stack",
        renderProps.props.direction === "horizontal" &&
          "json-render-stack--horizontal",
        renderProps.props.align &&
          `json-render-stack--align-${renderProps.props.align}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        gap: renderProps.props.gap ? `${renderProps.props.gap}px` : undefined,
        padding: renderProps.props.padding
          ? `${renderProps.props.padding}px`
          : undefined,
      }}
    >
      {renderProps.children}
    </div>
  ),

  Card: (renderProps) => (
    <div class="json-render-card">
      {renderProps.props.title && (
        <div class="json-render-card-title-wrap">
          <h2 class="json-render-card-title">{renderProps.props.title}</h2>
        </div>
      )}
      {renderProps.props.subtitle && (
        <p class="json-render-card-subtitle">{renderProps.props.subtitle}</p>
      )}
      {renderProps.children}
    </div>
  ),

  Text: (renderProps) => (
    <span
      class={[
        "json-render-text",
        renderProps.props.size !== "md" &&
          renderProps.props.size &&
          `json-render-text--${renderProps.props.size}`,
        renderProps.props.weight !== "normal" &&
          renderProps.props.weight &&
          `json-render-text--${renderProps.props.weight}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={renderProps.props.color ? { color: renderProps.props.color } : {}}
    >
      {String(renderProps.props.content ?? "")}
    </span>
  ),

  Button: (renderProps) => (
    <button
      disabled={renderProps.props.disabled}
      onClick={() => renderProps.emit("press")}
      class={[
        "json-render-button",
        renderProps.props.variant &&
          `json-render-button--${renderProps.props.variant}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {renderProps.props.label}
    </button>
  ),

  Badge: (renderProps) => (
    <span
      class="json-render-badge"
      style={
        renderProps.props.color
          ? {
              "background-color": `${renderProps.props.color}20`,
              color: renderProps.props.color,
              "border-color": `${renderProps.props.color}40`,
            }
          : {}
      }
    >
      {renderProps.props.label}
    </span>
  ),

  ListItem: (renderProps) => (
    <div
      onClick={() => renderProps.emit("press")}
      class={[
        "json-render-list-item",
        renderProps.props.completed && "json-render-list-item--done",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        class={[
          "json-render-list-item-check",
          renderProps.props.completed && "json-render-list-item-check--done",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {renderProps.props.completed ? "✓" : ""}
      </div>
      <span
        class={[
          "json-render-list-item-text",
          renderProps.props.completed && "json-render-list-item-text--done",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {renderProps.props.title}
      </span>
    </div>
  ),

  RendererBadge: (renderProps) => (
    <span class="json-render-renderer-badge">
      <span class="json-render-renderer-dot" />
      {renderProps.props.renderer === "vue"
        ? "Rendered with Vue"
        : renderProps.props.renderer === "react"
          ? "Rendered with React"
          : renderProps.props.renderer === "svelte"
            ? "Rendered with Svelte"
            : "Rendered with Solid"}
    </span>
  ),

  RendererTabs: (renderProps) => (
    <div class="json-render-renderer-tabs-wrapper">
      <span class="json-render-renderer-tabs-label">Render</span>
      <div class="json-render-renderer-tabs">
        <button
          onClick={() => renderProps.emit("pressVue")}
          class={[
            "json-render-renderer-tab",
            renderProps.props.renderer === "vue" &&
              "json-render-renderer-tab--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          Vue
        </button>
        <button
          onClick={() => renderProps.emit("pressReact")}
          class={[
            "json-render-renderer-tab",
            renderProps.props.renderer === "react" &&
              "json-render-renderer-tab--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          React
        </button>
        <button
          onClick={() => renderProps.emit("pressSvelte")}
          class={[
            "json-render-renderer-tab",
            renderProps.props.renderer === "svelte" &&
              "json-render-renderer-tab--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          Svelte
        </button>
        <button
          onClick={() => renderProps.emit("pressSolid")}
          class={[
            "json-render-renderer-tab",
            renderProps.props.renderer === "solid" &&
              "json-render-renderer-tab--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          Solid
        </button>
      </div>
    </div>
  ),
};

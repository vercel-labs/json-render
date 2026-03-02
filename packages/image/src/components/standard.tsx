import React from "react";
import type { ComponentRenderProps, ComponentRegistry } from "../types";
import type { StandardComponentProps } from "../catalog";

const headingSizes: Record<string, number> = {
  h1: 48,
  h2: 36,
  h3: 28,
  h4: 22,
};

const headingWeights: Record<string, number> = {
  h1: 700,
  h2: 700,
  h3: 600,
  h4: 600,
};

/**
 * Satori crashes on explicit `undefined` style values (e.g. `padding: undefined`).
 * Strip them so only defined properties are passed.
 */
function cleanStyle(raw: Record<string, unknown>): React.CSSProperties {
  const out: Record<string, unknown> = {};
  for (const k in raw) {
    if (raw[k] !== undefined && raw[k] !== null) {
      out[k] = raw[k];
    }
  }
  return out as React.CSSProperties;
}

// =============================================================================
// Root
// =============================================================================

function FrameComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Frame">>) {
  const p = element.props;

  return (
    <div
      style={cleanStyle({
        display: p.display ?? "flex",
        flexDirection: p.flexDirection ?? "column",
        width: p.width,
        height: p.height,
        backgroundColor: p.backgroundColor ?? "white",
        padding: p.padding,
        alignItems: p.alignItems,
        justifyContent: p.justifyContent,
      })}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Layout Components
// =============================================================================

function BoxComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Box">>) {
  const p = element.props;

  return (
    <div
      style={cleanStyle({
        display: "flex",
        flexDirection: p.flexDirection ?? "column",
        padding: p.padding,
        paddingTop: p.paddingTop,
        paddingBottom: p.paddingBottom,
        paddingLeft: p.paddingLeft,
        paddingRight: p.paddingRight,
        margin: p.margin,
        backgroundColor: p.backgroundColor,
        borderWidth: p.borderWidth,
        borderColor: p.borderColor,
        borderRadius: p.borderRadius,
        borderStyle: p.borderWidth ? "solid" : undefined,
        flex: p.flex,
        width: p.width,
        height: p.height,
        alignItems: p.alignItems,
        justifyContent: p.justifyContent,
        position: p.position,
        top: p.top,
        left: p.left,
        right: p.right,
        bottom: p.bottom,
        overflow: p.overflow,
      })}
    >
      {children}
    </div>
  );
}

function RowComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Row">>) {
  const p = element.props;

  return (
    <div
      style={cleanStyle({
        display: "flex",
        flexDirection: "row",
        gap: p.gap,
        alignItems: p.alignItems,
        justifyContent: p.justifyContent,
        padding: p.padding,
        flex: p.flex,
        flexWrap: p.wrap ? "wrap" : undefined,
      })}
    >
      {children}
    </div>
  );
}

function ColumnComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Column">>) {
  const p = element.props;

  return (
    <div
      style={cleanStyle({
        display: "flex",
        flexDirection: "column",
        gap: p.gap,
        alignItems: p.alignItems,
        justifyContent: p.justifyContent,
        padding: p.padding,
        flex: p.flex,
      })}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Content Components
// =============================================================================

function HeadingComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Heading">>) {
  const p = element.props;
  const level = p.level ?? "h2";

  return (
    <div
      style={cleanStyle({
        display: "flex",
        fontSize: headingSizes[level] ?? 36,
        fontWeight: headingWeights[level] ?? 700,
        color: p.color ?? "black",
        textAlign: p.align ?? "left",
        letterSpacing: p.letterSpacing,
        lineHeight: p.lineHeight ?? 1.2,
      })}
    >
      {p.text}
    </div>
  );
}

function TextComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Text">>) {
  const p = element.props;

  return (
    <div
      style={cleanStyle({
        display: "flex",
        fontSize: p.fontSize ?? 16,
        color: p.color ?? "black",
        textAlign: p.align ?? "left",
        fontWeight: p.fontWeight === "bold" ? 700 : 400,
        fontStyle: p.fontStyle ?? "normal",
        lineHeight: p.lineHeight ?? 1.4,
        letterSpacing: p.letterSpacing,
        textDecoration: p.textDecoration,
      })}
    >
      {p.text}
    </div>
  );
}

function ImageComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Image">>) {
  const p = element.props;

  return (
    <img
      src={p.src}
      width={p.width ?? undefined}
      height={p.height ?? undefined}
      style={cleanStyle({
        borderRadius: p.borderRadius,
        objectFit: p.objectFit ?? "contain",
      })}
    />
  );
}

// =============================================================================
// Decorative Components
// =============================================================================

function DividerComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Divider">>) {
  const p = element.props;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        borderBottom: `${p.thickness ?? 1}px solid ${p.color ?? "#e5e7eb"}`,
        marginTop: p.marginTop ?? 8,
        marginBottom: p.marginBottom ?? 8,
      }}
    />
  );
}

function SpacerComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Spacer">>) {
  const p = element.props;

  return <div style={{ display: "flex", height: p.height ?? 20 }} />;
}

// =============================================================================
// Registry
// =============================================================================

export const standardComponents: ComponentRegistry = {
  Frame: FrameComponent,
  Box: BoxComponent,
  Row: RowComponent,
  Column: ColumnComponent,
  Heading: HeadingComponent,
  Text: TextComponent,
  Image: ImageComponent,
  Divider: DividerComponent,
  Spacer: SpacerComponent,
};

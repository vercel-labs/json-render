"use client";

import React from "react";
import { type ComponentRenderProps } from "@json-render/react";

export function Button({ element, onAction, loading }: ComponentRenderProps) {
  const { label, variant, action, disabled } = element.props as {
    label: string;
    variant?: string | null;
    action: string;
    disabled?: boolean | null;
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--foreground)",
      color: "var(--background)",
      border: "none",
    },
    secondary: {
      background: "transparent",
      color: "var(--foreground)",
      border: "1px solid var(--border)",
    },
    danger: { background: "#dc2626", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "var(--muted)", border: "none" },
  };

  return (
    <button
      onClick={() => !disabled && action && onAction?.({ name: action })}
      disabled={!!disabled || loading}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--radius)",
        fontSize: 14,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        ...variants[variant || "primary"],
      }}
    >
      {loading ? "Loading..." : label}
    </button>
  );
}

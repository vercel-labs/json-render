"use client";

import { standardComponents } from "@json-render/react-email";

export const registry = standardComponents;

export function Fallback({ type }: { type: string }) {
  return (
    <div
      style={{
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#991b1b",
        borderRadius: 6,
        padding: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
      }}
    >
      Unknown email component: {type}
    </div>
  );
}

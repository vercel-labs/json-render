"use client";

import { defineRegistry, standardComponents } from "@json-render/react-email";
import type { Components } from "@json-render/react-email";
import { playgroundCatalog } from "./catalog";

export const { registry } = defineRegistry(playgroundCatalog, {
  components: standardComponents as unknown as Components<
    typeof playgroundCatalog
  >,
});

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

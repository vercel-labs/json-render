"use client";

import { JSONUIProvider, Renderer, defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "@/catalog/catalog";
import { pageSpec as spec } from "@/catalog/spec";

const { registry, handlers } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Text: shadcnComponents.Text,
    Badge: shadcnComponents.Badge,
    Alert: shadcnComponents.Alert,
    Button: shadcnComponents.Button,
    Metric: ({ props }) => (
      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}
      >
        <div style={{ fontSize: 12, color: "#6b7280" }}>{props.label}</div>
        <div style={{ fontSize: 24, fontWeight: 600 }}>{props.value}</div>
        <div style={{ fontSize: 12 }}>
          {props.trend === "up"
            ? "Trending up"
            : props.trend === "down"
              ? "Trending down"
              : "No change"}
        </div>
      </div>
    ),
  },
  actions: {
    trackMetric: async (params) => {
      console.log("[shadcn-catalog] metric interaction", params);
    },
  },
});

export default function Page() {
  return (
    <JSONUIProvider
      registry={registry}
      handlers={handlers(
        () => undefined,
        () => ({}),
      )}
    >
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
        <Renderer spec={spec} registry={registry} />
      </main>
    </JSONUIProvider>
  );
}

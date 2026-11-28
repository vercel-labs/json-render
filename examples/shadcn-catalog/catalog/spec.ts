import type { Spec } from "@json-render/core";

export const pageSpec: Spec = {
  root: "page",
  elements: {
    page: {
      type: "Stack",
      props: {
        direction: "vertical",
        gap: "md",
        align: null,
        justify: null,
        className: null,
      },
      children: ["heading", "intro", "status", "metric", "note", "refresh"],
    },
    heading: {
      type: "Heading",
      props: { text: "Account overview", level: "h1" },
      children: [],
    },
    intro: {
      type: "Text",
      props: {
        text: "Built from the shadcn catalog with one custom Metric component.",
        variant: "muted",
      },
      children: [],
    },
    status: {
      type: "Badge",
      props: { text: "Active", variant: "default" },
      children: [],
    },
    metric: {
      type: "Metric",
      props: { label: "Revenue", value: "$12,480", trend: "up" },
      children: [],
    },
    note: {
      type: "Alert",
      props: {
        title: "Synced",
        message: "Metrics were refreshed this morning.",
        type: "success",
      },
      children: [],
    },
    refresh: {
      type: "Button",
      props: { label: "Refresh metrics", variant: "primary", disabled: null },
      on: {
        press: {
          action: "trackMetric",
          params: { metric: "revenue", value: "$12,480" },
        },
      },
      children: [],
    },
  },
};

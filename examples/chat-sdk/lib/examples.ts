import type { Spec } from "@json-render/core";

export interface Example {
  name: string;
  label: string;
  description: string;
  spec: Spec;
}

const leaf = (type: string, props: Record<string, unknown>) => ({
  type,
  props,
  children: [] as string[],
});

export const examples: Example[] = [
  {
    name: "deploy-report",
    label: "Deploy report",
    description: "KPIs, a bar chart, a table and actions",
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: {
            title: "Weekly deploy report",
            subtitle: "Oct 27 to Oct 31",
          },
          children: ["summary", "kpis", "chart", "table", "actions"],
        },
        summary: leaf("Text", {
          content:
            "We shipped **985 deploys** this week. Thursday was the busiest day and `api` had the highest failure rate.",
        }),
        kpis: { type: "Fields", props: {}, children: ["deploys", "failures"] },
        deploys: leaf("Field", { label: "Total deploys", value: "985" }),
        failures: leaf("Field", { label: "Failure rate", value: "2.1%" }),
        chart: leaf("Chart", {
          title: "Deploys per day",
          chart: {
            type: "bar",
            categories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            series: [{ name: "Deploys", values: [180, 210, 195, 240, 160] }],
            xLabel: "Day",
            yLabel: "Deploys",
          },
        }),
        table: leaf("Table", {
          headers: ["Project", "Deploys", "Failed"],
          rows: [
            ["web", "412", "1.2%"],
            ["api", "203", "3.4%"],
            ["docs", "88", "0%"],
          ],
          align: ["left", "right", "right"],
        }),
        actions: { type: "Actions", props: {}, children: ["ack", "open"] },
        ack: leaf("Button", {
          id: "acknowledge",
          label: "Acknowledge",
          style: "primary",
        }),
        open: leaf("LinkButton", {
          label: "Open dashboard",
          url: "https://vercel.com/dashboard",
        }),
      },
    } as Spec,
  },
  {
    name: "incident",
    label: "Incident update",
    description: "Fields and buttons, no chart",
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Incident update: checkout API latency" },
          children: ["summary", "kpis", "owner", "actions"],
        },
        summary: leaf("Text", {
          content:
            "Checkout API p95 latency spiked to **2.4s** at 14:05 UTC. We rolled back `dpl_83k` at 14:22 and latency is back to **310ms**.",
        }),
        kpis: {
          type: "Fields",
          props: {},
          children: ["peak", "now", "errors", "duration"],
        },
        peak: leaf("Field", { label: "Peak p95", value: "2.4s" }),
        now: leaf("Field", { label: "Current p95", value: "310ms" }),
        errors: leaf("Field", { label: "Error rate", value: "3% of requests" }),
        duration: leaf("Field", { label: "Duration", value: "17 minutes" }),
        owner: leaf("Text", {
          content: "Owner: payments team",
          style: "muted",
        }),
        actions: { type: "Actions", props: {}, children: ["ack", "pm"] },
        ack: leaf("Button", {
          id: "acknowledge",
          label: "Acknowledge",
          style: "primary",
        }),
        pm: leaf("LinkButton", {
          label: "Open postmortem",
          url: "https://example.com/postmortem",
        }),
      },
    } as Spec,
  },
  {
    name: "traffic-share",
    label: "Traffic share",
    description: "A pie chart for a share of a whole",
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Traffic share by region", subtitle: "This month" },
          children: ["summary", "chart"],
        },
        summary: leaf("Text", {
          content:
            "**Europe grew 4 points** this month and now makes up 31% of traffic.",
        }),
        chart: leaf("Chart", {
          title: "Traffic share by region",
          chart: {
            type: "pie",
            segments: [
              { label: "North America", value: 46 },
              { label: "Europe", value: 31 },
              { label: "Asia", value: 15 },
              { label: "South America", value: 6 },
              { label: "Other", value: 2 },
            ],
          },
        }),
      },
    } as Spec,
  },
  {
    name: "weekly-active-users",
    label: "Weekly active users",
    description: "A line chart with two series",
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: {
            title: "Weekly active users",
            subtitle: "Last 6 weeks, web and mobile",
          },
          children: ["summary", "chart"],
        },
        summary: leaf("Text", {
          content:
            "Total weekly active users grew from **20k to 27k**. Mobile grew faster than web and now holds about 40% of the total.",
        }),
        chart: leaf("Chart", {
          title: "Weekly active users by platform",
          chart: {
            type: "line",
            categories: [
              "Week 1",
              "Week 2",
              "Week 3",
              "Week 4",
              "Week 5",
              "Week 6",
            ],
            series: [
              {
                name: "Web",
                values: [12000, 13000, 12500, 14000, 15000, 16000],
              },
              {
                name: "Mobile",
                values: [8000, 8500, 9000, 9800, 10500, 11000],
              },
            ],
            xLabel: "Week",
            yLabel: "Weekly active users",
          },
        }),
      },
    } as Spec,
  },
];

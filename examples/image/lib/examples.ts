import type { Spec } from "@json-render/core";

export interface Example {
  name: string;
  label: string;
  description: string;
  spec: Spec;
}

export const examples: Example[] = [
  // ==========================================================================
  // OG Image
  // ==========================================================================
  {
    name: "og-image",
    label: "OG Image",
    description: "Social sharing card for Open Graph (1200x630)",
    spec: {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: {
            width: 1200,
            height: 630,
            backgroundColor: "#0f172a",
            padding: 60,
            flexDirection: "column",
            justifyContent: "space-between",
          },
          children: ["top-row", "content", "bottom-row"],
        },
        "top-row": {
          type: "Row",
          props: { gap: 12, alignItems: "center" },
          children: ["logo-dot", "brand"],
        },
        "logo-dot": {
          type: "Box",
          props: {
            width: 32,
            height: 32,
            backgroundColor: "#6366f1",
            borderRadius: 16,
          },
          children: [],
        },
        brand: {
          type: "Text",
          props: { text: "acme.dev", fontSize: 24, color: "#94a3b8" },
          children: [],
        },
        content: {
          type: "Column",
          props: { gap: 16 },
          children: ["title", "subtitle"],
        },
        title: {
          type: "Heading",
          props: {
            text: "Build faster with the modern developer platform",
            level: "h1",
            color: "#f8fafc",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          },
          children: [],
        },
        subtitle: {
          type: "Text",
          props: {
            text: "Ship production-ready apps in minutes, not months.",
            fontSize: 24,
            color: "#94a3b8",
            lineHeight: 1.4,
          },
          children: [],
        },
        "bottom-row": {
          type: "Row",
          props: { gap: 8, alignItems: "center" },
          children: ["url"],
        },
        url: {
          type: "Text",
          props: {
            text: "acme.dev/platform",
            fontSize: 18,
            color: "#6366f1",
            fontWeight: "bold",
          },
          children: [],
        },
      },
    },
  },

  // ==========================================================================
  // Blog Post Card
  // ==========================================================================
  {
    name: "blog-card",
    label: "Blog Post Card",
    description: "Social card for a blog post with author info",
    spec: {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: {
            width: 1200,
            height: 630,
            backgroundColor: "#ffffff",
            padding: 60,
            flexDirection: "column",
            justifyContent: "space-between",
          },
          children: ["header", "body", "footer"],
        },
        header: {
          type: "Row",
          props: { gap: 10, alignItems: "center" },
          children: ["category-badge"],
        },
        "category-badge": {
          type: "Box",
          props: {
            backgroundColor: "#dbeafe",
            borderRadius: 20,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 16,
            paddingRight: 16,
          },
          children: ["category-text"],
        },
        "category-text": {
          type: "Text",
          props: {
            text: "Engineering",
            fontSize: 16,
            color: "#1d4ed8",
            fontWeight: "bold",
          },
          children: [],
        },
        body: {
          type: "Column",
          props: { gap: 20 },
          children: ["blog-title", "blog-excerpt"],
        },
        "blog-title": {
          type: "Heading",
          props: {
            text: "How We Reduced API Latency by 90% with Edge Computing",
            level: "h1",
            color: "#0f172a",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          },
          children: [],
        },
        "blog-excerpt": {
          type: "Text",
          props: {
            text: "A deep dive into our migration from centralized servers to edge functions, and the performance gains we achieved along the way.",
            fontSize: 22,
            color: "#64748b",
            lineHeight: 1.5,
          },
          children: [],
        },
        footer: {
          type: "Row",
          props: { gap: 16, alignItems: "center" },
          children: ["author-avatar", "author-info"],
        },
        "author-avatar": {
          type: "Box",
          props: {
            width: 48,
            height: 48,
            backgroundColor: "#e2e8f0",
            borderRadius: 24,
          },
          children: [],
        },
        "author-info": {
          type: "Column",
          props: { gap: 2 },
          children: ["author-name", "author-date"],
        },
        "author-name": {
          type: "Text",
          props: {
            text: "Sarah Chen",
            fontSize: 18,
            color: "#0f172a",
            fontWeight: "bold",
          },
          children: [],
        },
        "author-date": {
          type: "Text",
          props: {
            text: "February 15, 2026",
            fontSize: 16,
            color: "#94a3b8",
          },
          children: [],
        },
      },
    },
  },

  // ==========================================================================
  // Event Banner
  // ==========================================================================
  {
    name: "event-banner",
    label: "Event Banner",
    description: "Wide promotional banner for an event (1920x1080)",
    spec: {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: {
            width: 1920,
            height: 1080,
            backgroundColor: "#18181b",
            padding: 100,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          },
          children: [
            "badge-row",
            "spacer-1",
            "event-title",
            "spacer-2",
            "details-row",
            "spacer-3",
            "cta",
          ],
        },
        "badge-row": {
          type: "Row",
          props: { alignItems: "center", justifyContent: "center" },
          children: ["live-badge"],
        },
        "live-badge": {
          type: "Box",
          props: {
            backgroundColor: "#dc2626",
            borderRadius: 24,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 24,
            paddingRight: 24,
          },
          children: ["live-text"],
        },
        "live-text": {
          type: "Text",
          props: {
            text: "LIVE EVENT",
            fontSize: 18,
            color: "#ffffff",
            fontWeight: "bold",
            letterSpacing: "0.1em",
          },
          children: [],
        },
        "spacer-1": {
          type: "Spacer",
          props: { height: 40 },
          children: [],
        },
        "event-title": {
          type: "Heading",
          props: {
            text: "DevConf 2026",
            level: "h1",
            color: "#ffffff",
            align: "center",
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
          },
          children: [],
        },
        "spacer-2": {
          type: "Spacer",
          props: { height: 32 },
          children: [],
        },
        "details-row": {
          type: "Row",
          props: {
            gap: 40,
            alignItems: "center",
            justifyContent: "center",
          },
          children: ["date-text", "dot-sep", "location-text"],
        },
        "date-text": {
          type: "Text",
          props: {
            text: "March 15-17, 2026",
            fontSize: 28,
            color: "#a1a1aa",
          },
          children: [],
        },
        "dot-sep": {
          type: "Text",
          props: { text: "/", fontSize: 28, color: "#52525b" },
          children: [],
        },
        "location-text": {
          type: "Text",
          props: {
            text: "San Francisco, CA",
            fontSize: 28,
            color: "#a1a1aa",
          },
          children: [],
        },
        "spacer-3": {
          type: "Spacer",
          props: { height: 48 },
          children: [],
        },
        cta: {
          type: "Box",
          props: {
            backgroundColor: "#6366f1",
            borderRadius: 12,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 48,
            paddingRight: 48,
            alignItems: "center",
            justifyContent: "center",
          },
          children: ["cta-text"],
        },
        "cta-text": {
          type: "Text",
          props: {
            text: "Register Now",
            fontSize: 24,
            color: "#ffffff",
            fontWeight: "bold",
            letterSpacing: "0.02em",
          },
          children: [],
        },
      },
    },
  },

  // ==========================================================================
  // Social Square
  // ==========================================================================
  {
    name: "social-square",
    label: "Social Square",
    description: "Square format card for Instagram or social media (1080x1080)",
    spec: {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: {
            width: 1080,
            height: 1080,
            backgroundColor: "#faf5ff",
            padding: 80,
            flexDirection: "column",
            justifyContent: "space-between",
          },
          children: ["top-section", "quote-section", "bottom-section"],
        },
        "top-section": {
          type: "Row",
          props: {
            alignItems: "center",
            justifyContent: "space-between",
          },
          children: ["quote-icon", "slide-number"],
        },
        "quote-icon": {
          type: "Heading",
          props: { text: '"', level: "h1", color: "#9333ea" },
          children: [],
        },
        "slide-number": {
          type: "Text",
          props: {
            text: "01 / 05",
            fontSize: 18,
            color: "#a855f7",
            fontWeight: "bold",
            letterSpacing: "0.1em",
          },
          children: [],
        },
        "quote-section": {
          type: "Column",
          props: { gap: 24 },
          children: ["quote-text"],
        },
        "quote-text": {
          type: "Heading",
          props: {
            text: "The best way to predict the future is to create it.",
            level: "h2",
            color: "#1e1b4b",
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          },
          children: [],
        },
        "bottom-section": {
          type: "Column",
          props: { gap: 4 },
          children: ["author-name-sq", "author-title"],
        },
        "author-name-sq": {
          type: "Text",
          props: {
            text: "Peter Drucker",
            fontSize: 22,
            color: "#1e1b4b",
            fontWeight: "bold",
          },
          children: [],
        },
        "author-title": {
          type: "Text",
          props: {
            text: "Management Consultant & Author",
            fontSize: 18,
            color: "#7c3aed",
          },
          children: [],
        },
      },
    },
  },

  // ==========================================================================
  // Bar Graph
  // ==========================================================================
  {
    name: "bar-graph",
    label: "Bar Graph",
    description: "Data visualization bar chart (1200x630)",
    spec: {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: {
            width: 1200,
            height: 630,
            backgroundColor: "#ffffff",
            padding: 48,
            flexDirection: "column",
          },
          children: ["header", "chart-area"],
        },
        header: {
          type: "Column",
          props: { gap: 4 },
          children: ["chart-title", "chart-subtitle"],
        },
        "chart-title": {
          type: "Heading",
          props: {
            text: "Monthly Revenue",
            level: "h2",
            color: "#0f172a",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          },
          children: [],
        },
        "chart-subtitle": {
          type: "Text",
          props: {
            text: "Q3-Q4 2025 (in thousands USD)",
            fontSize: 18,
            color: "#94a3b8",
          },
          children: [],
        },
        "chart-area": {
          type: "Row",
          props: {
            gap: 0,
            alignItems: "flex-end",
            justifyContent: "space-between",
            flex: 1,
          },
          children: [
            "bar-jul",
            "bar-aug",
            "bar-sep",
            "bar-oct",
            "bar-nov",
            "bar-dec",
          ],
        },

        "bar-jul": {
          type: "Column",
          props: {
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          },
          children: ["val-jul", "rect-jul", "lbl-jul"],
        },
        "val-jul": {
          type: "Text",
          props: {
            text: "$42k",
            fontSize: 16,
            color: "#64748b",
            align: "center",
            fontWeight: "bold",
          },
          children: [],
        },
        "rect-jul": {
          type: "Box",
          props: {
            width: 80,
            height: 168,
            backgroundColor: "#6366f1",
            borderRadius: 8,
          },
          children: [],
        },
        "lbl-jul": {
          type: "Text",
          props: {
            text: "Jul",
            fontSize: 16,
            color: "#64748b",
            align: "center",
          },
          children: [],
        },

        "bar-aug": {
          type: "Column",
          props: {
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          },
          children: ["val-aug", "rect-aug", "lbl-aug"],
        },
        "val-aug": {
          type: "Text",
          props: {
            text: "$58k",
            fontSize: 16,
            color: "#64748b",
            align: "center",
            fontWeight: "bold",
          },
          children: [],
        },
        "rect-aug": {
          type: "Box",
          props: {
            width: 80,
            height: 232,
            backgroundColor: "#6366f1",
            borderRadius: 8,
          },
          children: [],
        },
        "lbl-aug": {
          type: "Text",
          props: {
            text: "Aug",
            fontSize: 16,
            color: "#64748b",
            align: "center",
          },
          children: [],
        },

        "bar-sep": {
          type: "Column",
          props: {
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          },
          children: ["val-sep", "rect-sep", "lbl-sep"],
        },
        "val-sep": {
          type: "Text",
          props: {
            text: "$51k",
            fontSize: 16,
            color: "#64748b",
            align: "center",
            fontWeight: "bold",
          },
          children: [],
        },
        "rect-sep": {
          type: "Box",
          props: {
            width: 80,
            height: 204,
            backgroundColor: "#6366f1",
            borderRadius: 8,
          },
          children: [],
        },
        "lbl-sep": {
          type: "Text",
          props: {
            text: "Sep",
            fontSize: 16,
            color: "#64748b",
            align: "center",
          },
          children: [],
        },

        "bar-oct": {
          type: "Column",
          props: {
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          },
          children: ["val-oct", "rect-oct", "lbl-oct"],
        },
        "val-oct": {
          type: "Text",
          props: {
            text: "$73k",
            fontSize: 16,
            color: "#64748b",
            align: "center",
            fontWeight: "bold",
          },
          children: [],
        },
        "rect-oct": {
          type: "Box",
          props: {
            width: 80,
            height: 292,
            backgroundColor: "#818cf8",
            borderRadius: 8,
          },
          children: [],
        },
        "lbl-oct": {
          type: "Text",
          props: {
            text: "Oct",
            fontSize: 16,
            color: "#64748b",
            align: "center",
          },
          children: [],
        },

        "bar-nov": {
          type: "Column",
          props: {
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          },
          children: ["val-nov", "rect-nov", "lbl-nov"],
        },
        "val-nov": {
          type: "Text",
          props: {
            text: "$85k",
            fontSize: 16,
            color: "#64748b",
            align: "center",
            fontWeight: "bold",
          },
          children: [],
        },
        "rect-nov": {
          type: "Box",
          props: {
            width: 80,
            height: 340,
            backgroundColor: "#818cf8",
            borderRadius: 8,
          },
          children: [],
        },
        "lbl-nov": {
          type: "Text",
          props: {
            text: "Nov",
            fontSize: 16,
            color: "#64748b",
            align: "center",
          },
          children: [],
        },

        "bar-dec": {
          type: "Column",
          props: {
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          },
          children: ["val-dec", "rect-dec", "lbl-dec"],
        },
        "val-dec": {
          type: "Text",
          props: {
            text: "$97k",
            fontSize: 16,
            color: "#64748b",
            align: "center",
            fontWeight: "bold",
          },
          children: [],
        },
        "rect-dec": {
          type: "Box",
          props: {
            width: 80,
            height: 388,
            backgroundColor: "#4f46e5",
            borderRadius: 8,
          },
          children: [],
        },
        "lbl-dec": {
          type: "Text",
          props: {
            text: "Dec",
            fontSize: 16,
            color: "#64748b",
            align: "center",
          },
          children: [],
        },
      },
    },
  },
];

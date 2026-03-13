import type { Spec } from "@json-render/core";

export const demoSpec: Spec = {
  root: "root",
  state: {
    showBanner: true,
    userRole: "admin",
    features: [
      {
        id: "1",
        name: "SSR rendering",
        description: "Pure HTML output on the server",
      },
      {
        id: "2",
        name: "Zero dependencies",
        description: "No React, Vue, or Svelte required",
      },
      {
        id: "3",
        name: "SSG + SSR",
        description:
          "Works with any Astro adapter (Cloudflare, Vercel, Netlify, Node)",
      },
    ],
  },
  elements: {
    root: {
      type: "Section",
      props: { id: "app", className: null },
      children: [
        "header",
        "banner",
        "features-card",
        "admin-card",
        "timestamp-card",
        "links-card",
      ],
    },

    // Header
    header: {
      type: "Heading",
      props: { text: "@json-render/astro demo", level: "h1" },
      children: [],
    },

    // Conditional banner (visible when showBanner is true)
    banner: {
      type: "Badge",
      props: { label: "SSR-rendered at build time", variant: "success" },
      children: [],
      visible: { $state: "/showBanner" },
    },

    // Features card with repeat
    "features-card": {
      type: "Card",
      props: {
        title: "Features",
        subtitle: "What makes this renderer special",
      },
      children: ["features-list"],
    },
    "features-list": {
      type: "List",
      props: {},
      children: ["feature-item"],
      repeat: { statePath: "/features", key: "id" },
    },
    "feature-item": {
      type: "ListItem",
      props: {
        text: { $item: "name" },
      },
      children: [],
    },

    // Admin-only card (visible when role is admin)
    "admin-card": {
      type: "Card",
      props: {
        title: "Admin Panel",
        subtitle: null,
      },
      children: ["admin-text"],
      visible: { $state: "/userRole", eq: "admin" },
    },
    "admin-text": {
      type: "Text",
      props: {
        content: {
          $cond: { $state: "/userRole", eq: "admin" },
          $then: "You have full admin access.",
          $else: "Access restricted.",
        },
      },
      children: [],
    },

    // Server timestamp (resolved from request-time state)
    "timestamp-card": {
      type: "Card",
      props: {
        title: "Server Info",
        subtitle: null,
      },
      children: ["timestamp-text"],
    },
    "timestamp-text": {
      type: "Text",
      props: {
        content: { $state: "/serverTimestamp" },
      },
      children: [],
      visible: { $state: "/serverTimestamp" },
    },

    // Links
    "links-card": {
      type: "Card",
      props: {
        title: "Resources",
        subtitle: null,
      },
      children: ["link-docs", "link-github"],
    },
    "link-docs": {
      type: "Link",
      props: {
        href: "https://json-render.dev/docs/api/astro",
        text: "Documentation",
      },
      children: [],
    },
    "link-github": {
      type: "Link",
      props: {
        href: "https://github.com/vercel-labs/json-render/tree/main/examples/astro",
        text: "Source code",
      },
      children: [],
    },
  },
};

import { z } from "zod";

// Models often emit numbers for display values. Accept them and show them as text.
const displayText = z.union([z.string(), z.number()]).transform(String);

const pieChart = z.object({
  type: z.literal("pie"),
  segments: z
    .array(z.object({ label: z.string().min(1), value: z.number().positive() }))
    .min(1),
});

const seriesChart = z.object({
  type: z.enum(["bar", "line", "area"]),
  categories: z.array(z.string().min(1)).min(1),
  series: z
    .array(z.object({ name: z.string().min(1), values: z.array(z.number()) }))
    .min(1),
  xLabel: z.string().nullish(),
  yLabel: z.string().nullish(),
});

/**
 * Standard component definitions for Chat SDK catalogs.
 *
 * Each component maps to a Chat SDK card element, and each adapter converts
 * that element to its platform format (Block Kit, Adaptive Cards, Discord
 * embeds, Google Chat cards and so on).
 */
export const standardComponentDefinitions = {
  Card: {
    props: z.object({
      title: z.string().nullish(),
      subtitle: z.string().nullish(),
      imageUrl: z.string().url().nullish(),
    }),
    slots: ["default"],
    description:
      "Root of a message. Title renders as the card header, subtitle as secondary text.",
    example: { title: "Weekly deploys", subtitle: "Oct 27 to Nov 2" },
  },
  Section: {
    props: z.object({}),
    slots: ["default"],
    description: "Groups related elements.",
    example: {},
  },
  Text: {
    props: z.object({
      content: z.string().min(1),
      style: z.enum(["plain", "bold", "muted"]).nullish(),
    }),
    slots: [],
    description: "A paragraph of markdown text. Use muted for footnotes.",
    example: { content: "Deploys are **up 12%** week over week." },
  },
  Fields: {
    props: z.object({}),
    slots: ["default"],
    description: "Grid of label and value pairs. Children are Field elements.",
    example: {},
  },
  Field: {
    props: z.object({ label: z.string().min(1), value: displayText }),
    slots: [],
    description: "One label and value pair inside Fields. Good for KPIs.",
    example: { label: "Deploys", value: "1,284" },
  },
  Table: {
    props: z.object({
      headers: z.array(z.string()).min(1),
      rows: z.array(z.array(displayText)),
      align: z.array(z.enum(["left", "center", "right"])).nullish(),
      caption: z.string().nullish(),
    }),
    slots: [],
    description:
      "Table for row data. Every row has one cell per header. Right-align numeric columns.",
    example: {
      headers: ["Project", "Deploys"],
      rows: [
        ["web", "412"],
        ["api", "203"],
      ],
      align: ["left", "right"],
    },
  },
  Chart: {
    props: z.object({
      title: z.string().min(1),
      chart: z.union([pieChart, seriesChart]),
    }),
    slots: [],
    description:
      "Chart. pie for shares of a whole, bar, line or area for series over categories.",
    example: {
      title: "Deploys per day",
      chart: {
        type: "bar",
        categories: ["Mon", "Tue", "Wed"],
        series: [{ name: "Deploys", values: [180, 210, 195] }],
      },
    },
  },
  Divider: {
    props: z.object({}),
    slots: [],
    description: "Separator between groups.",
    example: {},
  },
  Image: {
    props: z.object({ url: z.string().url(), alt: z.string().min(1) }),
    slots: [],
    description: "Image from a public https URL.",
    example: { url: "https://picsum.photos/600/300", alt: "Preview" },
  },
  Actions: {
    props: z.object({}),
    slots: ["default"],
    description: "Row of Button and LinkButton elements.",
    example: {},
  },
  Button: {
    props: z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      style: z.enum(["primary", "danger", "default"]).nullish(),
      value: z.string().nullish(),
    }),
    slots: [],
    description:
      "Interactive button. id is the action id the bot handles with onAction.",
    example: { id: "approve", label: "Approve", style: "primary" },
  },
  LinkButton: {
    props: z.object({ label: z.string().min(1), url: z.string().url() }),
    slots: [],
    description: "Button that opens a URL.",
    example: { label: "Open dashboard", url: "https://vercel.com" },
  },
};

export type StandardComponentDefinitions = typeof standardComponentDefinitions;

import { z } from "zod";

// Models often emit numbers for display values. Accept them and show them as text.
const displayText = z.union([z.string(), z.number()]).transform(String);

const choiceProps = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    options: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
          description: z.string().nullish(),
        }),
      )
      .min(1),
    initialOption: z.string().nullish(),
    optional: z.boolean().nullish(),
    dispatchAction: z.boolean().nullish(),
  })
  .superRefine((props, ctx) => {
    const values = props.options.map((option) => option.value);
    if (new Set(values).size !== values.length)
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "option values must be unique",
      });
    if (props.initialOption != null && !values.includes(props.initialOption))
      ctx.addIssue({
        code: "custom",
        path: ["initialOption"],
        message: "initialOption must match an option value",
      });
  });

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
  Columns: {
    props: z.object({}),
    slots: ["default"],
    description:
      "Related Section or Card children arranged as columns when the adapter supports layout hints; otherwise stacked in order.",
    example: {},
  },
  Carousel: {
    props: z.object({}),
    slots: ["default"],
    description:
      "Section or Card items presented as a carousel when supported; otherwise stacked with their content and controls.",
    example: {},
  },
  TaskList: {
    props: z.object({ title: z.string().nullish() }),
    slots: ["default"],
    description:
      "A snapshot of related Task children, optionally headed by a title. Not a live Chat SDK Plan.",
    example: { title: "Deploy" },
  },
  Task: {
    props: z.object({
      title: z.string().min(1),
      status: z.enum(["pending", "in_progress", "complete", "error"]),
      details: z.string().nullish(),
      output: z.string().nullish(),
    }),
    slots: [],
    description:
      "Task title, status, optional details and output, rendered as portable text. Use inside TaskList.",
    example: { title: "Build", status: "complete", output: "Build passed" },
  },
  Feedback: {
    props: z.object({
      id: z.string().min(1),
      label: z.string().nullish(),
      positiveLabel: z.string().min(1).nullish(),
      negativeLabel: z.string().min(1).nullish(),
    }),
    slots: [],
    description:
      "Two ordinary action buttons using id:positive and id:negative action IDs, with positive and negative values. Supports the adapter's normal button behavior.",
    example: { id: "answer-feedback", label: "Was this helpful?" },
  },
  Link: {
    props: z.object({ label: z.string().min(1), url: z.string().url() }),
    slots: [],
    description: "An inline link rendered in each platform's text format.",
    example: { label: "Build log", url: "https://example.com/build" },
  },
  Select: {
    props: choiceProps,
    slots: [],
    description:
      "Single-choice dropdown inside Actions. Control availability and submission behavior follow Chat SDK and the adapter configuration.",
    example: {
      id: "environment",
      label: "Environment",
      options: [
        { label: "Production", value: "production" },
        { label: "Preview", value: "preview" },
      ],
    },
  },
  RadioSelect: {
    props: choiceProps,
    slots: [],
    description:
      "Single-choice radio group inside Actions. Adapter support and submission behavior follow Chat SDK.",
    example: {
      id: "priority",
      label: "Priority",
      options: [
        { label: "Normal", value: "normal" },
        { label: "Urgent", value: "urgent" },
      ],
    },
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
    description: "Row of Button, LinkButton, Select, and RadioSelect elements.",
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

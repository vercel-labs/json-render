import { z } from "zod";

// =============================================================================
// Standard Component Definitions for Ink (Terminal)
// =============================================================================

/**
 * Standard component definitions for Ink terminal catalogs.
 *
 * These can be used directly or extended with custom components.
 * All components are built using Ink core primitives only.
 */
export const standardComponentDefinitions = {
  // ==========================================================================
  // Layout Components (Ink Primitives)
  // ==========================================================================

  Box: {
    props: z.object({
      flexDirection: z
        .enum(["row", "row-reverse", "column", "column-reverse"])
        .nullable(),
      alignItems: z
        .enum(["flex-start", "center", "flex-end", "stretch"])
        .nullable(),
      justifyContent: z
        .enum([
          "flex-start",
          "center",
          "flex-end",
          "space-between",
          "space-around",
          "space-evenly",
        ])
        .nullable(),
      flexGrow: z.number().nullable(),
      flexShrink: z.number().nullable(),
      flexWrap: z.enum(["nowrap", "wrap", "wrap-reverse"]).nullable(),
      width: z.union([z.number().max(500), z.string()]).nullable(),
      height: z.union([z.number().max(500), z.string()]).nullable(),
      minWidth: z.union([z.number().max(500), z.string()]).nullable(),
      minHeight: z.union([z.number().max(500), z.string()]).nullable(),
      padding: z.number().nullable(),
      paddingX: z.number().nullable(),
      paddingY: z.number().nullable(),
      paddingTop: z.number().nullable(),
      paddingBottom: z.number().nullable(),
      paddingLeft: z.number().nullable(),
      paddingRight: z.number().nullable(),
      margin: z.number().nullable(),
      marginX: z.number().nullable(),
      marginY: z.number().nullable(),
      marginTop: z.number().nullable(),
      marginBottom: z.number().nullable(),
      marginLeft: z.number().nullable(),
      marginRight: z.number().nullable(),
      gap: z.number().nullable(),
      columnGap: z.number().nullable(),
      rowGap: z.number().nullable(),
      borderStyle: z
        .enum([
          "single",
          "double",
          "round",
          "bold",
          "singleDouble",
          "doubleSingle",
          "classic",
        ])
        .nullable(),
      borderColor: z.string().nullable(),
      borderTop: z.boolean().nullable(),
      borderBottom: z.boolean().nullable(),
      borderLeft: z.boolean().nullable(),
      borderRight: z.boolean().nullable(),
      borderDimColor: z.boolean().nullable(),
      display: z.enum(["flex", "none"]).nullable(),
      overflow: z.enum(["visible", "hidden"]).nullable(),
      backgroundColor: z.string().nullable(),
    }),
    slots: ["default"],
    description:
      "Flexbox layout container (like a terminal <div>). Use for grouping, spacing, borders, and alignment. Default flexDirection is row.",
    example: {
      flexDirection: "column",
      padding: 1,
      gap: 1,
      borderStyle: "round",
    },
  },

  Text: {
    props: z.object({
      text: z.string(),
      color: z.string().nullable(),
      backgroundColor: z.string().nullable(),
      bold: z.boolean().nullable(),
      italic: z.boolean().nullable(),
      underline: z.boolean().nullable(),
      strikethrough: z.boolean().nullable(),
      dimColor: z.boolean().nullable(),
      inverse: z.boolean().nullable(),
      wrap: z
        .enum([
          "wrap",
          "truncate",
          "truncate-end",
          "truncate-middle",
          "truncate-start",
        ])
        .nullable(),
    }),
    slots: [],
    description:
      "Text output with optional styling (color, bold, italic, etc.). Use for all text content in the terminal.",
    example: { text: "Hello, world!", bold: true, color: "green" },
  },

  Newline: {
    props: z.object({
      count: z.number().nullable(),
    }),
    slots: [],
    description:
      "Inserts one or more blank lines. Must be placed inside a Box with flexDirection column.",
    example: { count: 1 },
  },

  Spacer: {
    props: z.object({}),
    slots: [],
    description:
      "Flexible empty space that expands to fill available room along the main axis. Use between elements to push them apart.",
  },

  // ==========================================================================
  // Content Components (Higher-Level)
  // ==========================================================================

  Heading: {
    props: z.object({
      text: z.string(),
      level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
      color: z.string().nullable(),
    }),
    slots: [],
    description:
      "Section heading. h1 is bold + underlined, h2 is bold, h3 is bold + dimmed, h4 is dimmed.",
    example: { text: "Dashboard", level: "h1" },
  },

  Divider: {
    props: z.object({
      character: z.string().nullable(),
      color: z.string().nullable(),
      dimColor: z.boolean().nullable(),
      title: z.string().nullable(),
      width: z.number().max(500).nullable(),
    }),
    slots: [],
    description:
      "Horizontal separator line. Default width is 40 characters. Optionally includes a centered title.",
    example: { title: "Section", color: "gray", width: 40 },
  },

  Badge: {
    props: z.object({
      label: z.string(),
      variant: z
        .enum(["default", "info", "success", "warning", "error"])
        .nullable(),
    }),
    slots: [],
    description:
      "Small colored inline label for status, counts, and categories.",
    example: { label: "ACTIVE", variant: "success" },
  },

  Spinner: {
    props: z.object({
      label: z.string().nullable(),
      color: z.string().nullable(),
    }),
    slots: [],
    description:
      "Animated loading spinner with optional label text. Uses braille animation characters.",
    example: { label: "Loading...", color: "cyan" },
  },

  ProgressBar: {
    props: z.object({
      progress: z.number(),
      width: z.number().max(500).nullable(),
      color: z.string().nullable(),
      label: z.string().nullable(),
    }),
    slots: [],
    description:
      "Horizontal progress bar. Set progress from 0 to 1. Default width is 30 characters.",
    example: { progress: 0.65, width: 30, color: "green", label: "Uploading" },
  },

  Sparkline: {
    props: z.object({
      data: z.array(z.number()),
      width: z.number().max(500).nullable(),
      color: z.string().nullable(),
      label: z.string().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    slots: [],
    description:
      "Inline sparkline chart using Unicode block characters (▁▂▃▄▅▆▇█). Pass an array of numbers to visualize trends compactly. Set min/max to fix the scale across multiple sparklines.",
    example: {
      data: [3, 7, 2, 9, 4, 8, 1, 6, 5],
      color: "cyan",
      label: "CPU",
    },
  },

  BarChart: {
    props: z.object({
      data: z.array(
        z.object({
          label: z.string(),
          value: z.number(),
          color: z.string().nullable(),
        }),
      ),
      width: z.number().max(500).nullable(),
      showValues: z.boolean().nullable(),
      showPercentage: z.boolean().nullable(),
    }),
    slots: [],
    description:
      "Horizontal bar chart. Each item has a label, numeric value, and optional color. Set showValues to display raw numbers, showPercentage to show % of total. Default bar width is 30.",
    example: {
      data: [
        { label: "TypeScript", value: 65, color: "blue" },
        { label: "Python", value: 20, color: "yellow" },
        { label: "Rust", value: 15, color: "red" },
      ],
      showPercentage: true,
    },
  },

  Table: {
    props: z.object({
      columns: z.array(
        z.object({
          header: z.string(),
          key: z.string(),
          width: z.number().max(200).nullable(),
          align: z.enum(["left", "center", "right"]).nullable(),
        }),
      ),
      rows: z.array(z.record(z.string(), z.string())),
      borderStyle: z
        .enum(["single", "double", "round", "bold", "classic"])
        .nullable(),
      backgroundColor: z.string().nullable(),
      headerColor: z.string().nullable(),
    }),
    slots: [],
    description:
      "Tabular data display with headers and rows. Each row is a record mapping column keys to string values. Set both borderStyle and backgroundColor together so borders share the same shading.",
    example: {
      columns: [
        { header: "Name", key: "name", width: 20 },
        { header: "Status", key: "status", width: 10 },
      ],
      rows: [
        { name: "api-server", status: "running" },
        { name: "worker", status: "stopped" },
      ],
      headerColor: "cyan",
    },
  },

  List: {
    props: z.object({
      items: z.array(z.string()),
      ordered: z.boolean().nullable(),
      bulletChar: z.string().nullable(),
      spacing: z.number().nullable(),
    }),
    slots: [],
    description:
      "Bulleted or numbered list. Each item is a string. Use for simple enumerations.",
    example: {
      items: ["Install dependencies", "Run tests", "Deploy"],
      ordered: true,
    },
  },

  ListItem: {
    props: z.object({
      title: z.string(),
      subtitle: z.string().nullable(),
      leading: z.string().nullable(),
      trailing: z.string().nullable(),
    }),
    slots: [],
    description:
      "Structured list row with title, optional subtitle, and leading/trailing text. Use with repeat for dynamic lists.",
    example: {
      title: "package.json",
      subtitle: "Modified 2 hours ago",
      leading: "*",
      trailing: "2.1 KB",
    },
  },

  Card: {
    props: z.object({
      title: z.string().nullable(),
      backgroundColor: z.string().nullable(),
      padding: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Shaded container with optional title. Renders as a filled background area for grouping related content. Default background is a subtle dark shade.",
    example: { title: "Details", padding: 1 },
  },

  KeyValue: {
    props: z.object({
      label: z.string(),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
      labelColor: z.string().nullable(),
      separator: z.string().nullable(),
    }),
    slots: [],
    description:
      "Key-value pair display. Renders label and value on the same line. Value can be a string, number, or array of strings (joined with commas). Default separator is a colon.",
    example: { label: "Status", value: "Running", labelColor: "cyan" },
  },

  Link: {
    props: z.object({
      url: z.string(),
      label: z.string().nullable(),
      color: z.string().nullable(),
    }),
    slots: [],
    description:
      'Renders a URL as underlined text. If label is provided, shows "label (url)". Most terminals make URLs clickable automatically.',
    example: { url: "https://github.com/vercel/next.js", label: "Next.js" },
  },

  StatusLine: {
    props: z.object({
      text: z.string(),
      status: z.enum(["info", "success", "warning", "error"]).nullable(),
      icon: z.string().nullable(),
    }),
    slots: [],
    description:
      "Status message with colored icon. Default icons: info=ℹ, success=✔, warning=⚠, error=✖.",
    example: { text: "Build completed successfully", status: "success" },
  },

  Metric: {
    props: z.object({
      label: z.string(),
      value: z.string(),
      detail: z.string().nullable(),
      trend: z.enum(["up", "down", "neutral"]).nullable(),
    }),
    slots: [],
    description:
      "Key metric display with prominent value and optional trend indicator. Use for important numbers that deserve visual emphasis (price, temperature, stars, market cap).",
    example: {
      label: "Price",
      value: "$70,686",
      detail: "24h change",
      trend: "up",
    },
  },

  Callout: {
    props: z.object({
      type: z.enum(["info", "tip", "warning", "important"]).nullable(),
      title: z.string().nullable(),
      content: z.string(),
    }),
    slots: [],
    description:
      "Highlighted callout block with colored left border. Use for key takeaways, tips, warnings, or important notes that should stand out from surrounding content.",
    example: {
      type: "tip",
      title: "Key Takeaway",
      content:
        "Revenue peaked in FY2022 driven by iPhone 13/14 upgrade cycles.",
    },
  },

  Timeline: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string(),
          description: z.string().nullable(),
          date: z.string().nullable(),
          status: z.enum(["completed", "current", "upcoming"]).nullable(),
        }),
      ),
    }),
    slots: [],
    description:
      "Vertical timeline showing ordered events, steps, or milestones. Each item has a status-colored dot, title, optional date, and optional description.",
    example: {
      items: [
        {
          title: "Project Started",
          description: "Initial commit and setup",
          date: "Jan 2024",
          status: "completed",
        },
        {
          title: "Beta Release",
          description: "Public beta launched",
          date: "Mar 2024",
          status: "current",
        },
        { title: "v1.0", date: "Q2 2024", status: "upcoming" },
      ],
    },
  },

  // ==========================================================================
  // Interactive Components
  // ==========================================================================

  TextInput: {
    props: z.object({
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      label: z.string().nullable(),
      mask: z.string().nullable(),
    }),
    events: ["submit", "change"],
    slots: [],
    description:
      "Text input field for terminal. Use $bindState to bind to the state model for two-way binding. Press Enter to submit. Set mask to '*' for password fields.",
    example: { placeholder: "Type here...", label: "Name" },
  },

  Select: {
    props: z.object({
      options: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      value: z.string().nullable(),
      label: z.string().nullable(),
    }),
    events: ["change"],
    slots: [],
    description:
      "Selection menu navigated with arrow keys. Use $bindState on value to bind the selected value to state. Press Enter to confirm selection.",
    example: {
      options: [
        { label: "Development", value: "dev" },
        { label: "Staging", value: "staging" },
        { label: "Production", value: "prod" },
      ],
      label: "Environment",
    },
  },

  MultiSelect: {
    props: z.object({
      options: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      value: z.array(z.string()).nullable(),
      label: z.string().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    events: ["change", "submit"],
    slots: [],
    description:
      "Multi-selection menu. Navigate with arrow keys, toggle with space, confirm with enter. Use $bindState on value to bind the selected values array to state. Set min/max to constrain selection count.",
    example: {
      options: [
        { label: "TypeScript", value: "ts" },
        { label: "Python", value: "py" },
        { label: "Rust", value: "rs" },
        { label: "Go", value: "go" },
      ],
      label: "Languages",
    },
  },

  ConfirmInput: {
    props: z.object({
      message: z.string().nullable(),
      defaultValue: z.boolean().nullable(),
      yesLabel: z.string().nullable(),
      noLabel: z.string().nullable(),
    }),
    events: ["confirm", "deny"],
    slots: [],
    description:
      "Yes/No confirmation prompt. Press Y to confirm, N to deny. Use for destructive or irreversible actions.",
    example: {
      message: "Delete all files?",
    },
  },

  Tabs: {
    props: z.object({
      tabs: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          icon: z.string().nullable(),
        }),
      ),
      value: z.string().nullable(),
      color: z.string().nullable(),
    }),
    events: ["change"],
    slots: ["default"],
    description:
      "Tab bar navigation. Navigate with left/right arrow keys. Use $bindState on value to bind the active tab to state. Place child content inside and use visible conditions on children to show content for the active tab.",
    example: {
      tabs: [
        { label: "Overview", value: "overview" },
        { label: "Logs", value: "logs" },
        { label: "Settings", value: "settings" },
      ],
    },
  },

  Markdown: {
    props: z.object({
      text: z.string(),
    }),
    slots: [],
    description:
      "Renders markdown-formatted text with proper terminal styling. Supports headings (#), **bold**, *italic*, `inline code`, ~~strikethrough~~, fenced code blocks, lists (ordered and unordered), blockquotes (>), and horizontal rules (---).",
    example: {
      text: "## Overview\n\nThis is **bold** and *italic* text with `inline code`.\n\n- First item\n- Second item\n\n> A blockquote",
    },
  },
};

// =============================================================================
// Standard Action Definitions for Ink
// =============================================================================

/**
 * Standard action definitions for Ink terminal catalogs.
 */
export const standardActionDefinitions = {
  setState: {
    params: z.object({
      statePath: z.string(),
      value: z.unknown(),
    }),
    description: "Update a value in the state model at the given statePath.",
  },

  pushState: {
    params: z.object({
      statePath: z.string(),
      value: z.unknown(),
      clearStatePath: z.string().optional(),
    }),
    description:
      'Append an item to an array in the state model. The value can contain { $state: "/statePath" } references and "$id" for auto IDs. Use clearStatePath to reset another path after pushing.',
  },

  removeState: {
    params: z.object({
      statePath: z.string(),
      index: z.number(),
    }),
    description:
      "Remove an item from an array in the state model at the given index.",
  },

  exit: {
    params: z.object({
      code: z.number().optional(),
    }),
    description:
      "Exit the terminal application. Optional exit code (default 0).",
  },

  log: {
    params: z.object({
      message: z.string(),
    }),
    description:
      "Write a message to stdout outside the Ink render. Useful for persistent output that should remain visible after the UI updates.",
  },
};

// =============================================================================
// Types
// =============================================================================

/**
 * Type for a component definition
 */
export type ComponentDefinition = {
  props: z.ZodType;
  slots: string[];
  events?: string[];
  description: string;
};

/**
 * Type for an action definition
 */
export type ActionDefinition = {
  params: z.ZodType;
  description: string;
};

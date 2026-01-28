import { createCatalog } from "@json-render/core";
import { z } from "zod";

/**
 * Web playground component catalog
 *
 * This defines the components available for AI generation in the playground.
 */
export const playgroundCatalog = createCatalog({
  name: "playground",
  components: {
    // Layout Components
    Card: {
      props: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        maxWidth: z.enum(["sm", "md", "lg", "full"]).optional(),
        centered: z.boolean().optional(),
        className: z.array(z.string()).optional(),
      }),
      hasChildren: true,
      description:
        "Container card for content sections. Use for forms/content boxes, NOT for page headers.",
    },

    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).optional(),
        gap: z.enum(["none", "sm", "md", "lg"]).optional(),
        align: z.enum(["start", "center", "end", "stretch"]).optional(),
        justify: z
          .enum(["start", "center", "end", "between", "around"])
          .optional(),
        className: z.array(z.string()).optional(),
      }),
      hasChildren: true,
      description: "Flex container for layouts",
    },

    Grid: {
      props: z.object({
        columns: z
          .union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
            z.literal(6),
          ])
          .optional(),
        gap: z.enum(["sm", "md", "lg"]).optional(),
        className: z.array(z.string()).optional(),
      }),
      hasChildren: true,
      description: "Grid layout (1-6 columns)",
    },

    Divider: {
      props: z.object({
        className: z.array(z.string()).optional(),
      }),
      description: "Horizontal separator line",
    },

    // Form Inputs
    Input: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        type: z.enum(["text", "email", "password", "number"]).optional(),
        placeholder: z.string().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Text input field",
    },

    Textarea: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        placeholder: z.string().optional(),
        rows: z.number().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Multi-line text input",
    },

    Select: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(z.string()),
        placeholder: z.string().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Dropdown select input",
    },

    Checkbox: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Checkbox input",
    },

    Radio: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(z.string()),
        className: z.array(z.string()).optional(),
      }),
      description: "Radio button group",
    },

    Switch: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Toggle switch input",
    },

    // Actions
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).optional(),
        actionText: z.string().optional(),
        className: z.array(z.string()).optional(),
      }),
      description:
        "Clickable button. actionText is shown in toast on click (defaults to label)",
    },

    Link: {
      props: z.object({
        label: z.string(),
        href: z.string(),
        className: z.array(z.string()).optional(),
      }),
      description: "Anchor link",
    },

    // Typography
    Heading: {
      props: z.object({
        text: z.string(),
        level: z
          .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
          .optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Heading text (h1-h4)",
    },

    Text: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["body", "caption", "muted"]).optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Paragraph text",
    },

    // Data Display
    Image: {
      props: z.object({
        alt: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Placeholder image (displays alt text in a styled box)",
    },

    Avatar: {
      props: z.object({
        src: z.string().optional(),
        name: z.string(),
        size: z.enum(["sm", "md", "lg"]).optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "User avatar with fallback initials",
    },

    Badge: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["default", "success", "warning", "danger"]).optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Status badge",
    },

    Alert: {
      props: z.object({
        title: z.string(),
        message: z.string().optional(),
        type: z.enum(["info", "success", "warning", "error"]).optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Alert banner",
    },

    Progress: {
      props: z.object({
        value: z.number(),
        max: z.number().optional(),
        label: z.string().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Progress bar (value 0-100)",
    },

    Rating: {
      props: z.object({
        value: z.number(),
        max: z.number().optional(),
        label: z.string().optional(),
        className: z.array(z.string()).optional(),
      }),
      description: "Star rating display",
    },

    // Charts
    BarGraph: {
      props: z.object({
        title: z.string().optional(),
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
          }),
        ),
        className: z.array(z.string()).optional(),
      }),
      description: "Vertical bar chart",
    },

    LineGraph: {
      props: z.object({
        title: z.string().optional(),
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
          }),
        ),
        className: z.array(z.string()).optional(),
      }),
      description: "Line chart with points",
    },
  },
  validation: "strict",
});

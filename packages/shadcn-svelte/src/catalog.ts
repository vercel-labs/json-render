import { z } from "zod";

// =============================================================================
// Shared validation schemas used across form components
// =============================================================================

const validationCheckSchema = z
  .array(
    z.object({
      type: z.string(),
      message: z.string(),
      args: z.record(z.string(), z.unknown()).optional(),
    }),
  )
  .nullable();

const validateOnSchema = z.enum(["change", "blur", "submit"]).nullable();

// =============================================================================
// shadcn/ui Component Definitions
// =============================================================================

/**
 * shadcn/ui component definitions for json-render catalogs.
 *
 * These can be used directly or extended with custom components.
 * All components are built using Radix UI primitives + Tailwind CSS.
 */
export const shadcnComponentDefinitions = {
  // ==========================================================================
  // Layout Components
  // ==========================================================================

  Card: {
    props: z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      maxWidth: z.enum(["sm", "md", "lg", "full"]).nullable(),
      centered: z.boolean().nullable(),
    }),
    slots: ["default"],
    description:
      "Container card for content sections. Use for forms/content boxes, NOT for page headers.",
    example: { title: "Overview", description: "Your account summary" },
  },

  Stack: {
    props: z.object({
      direction: z.enum(["horizontal", "vertical"]).nullable(),
      gap: z.enum(["none", "sm", "md", "lg"]).nullable(),
      align: z.enum(["start", "center", "end", "stretch"]).nullable(),
      justify: z
        .enum(["start", "center", "end", "between", "around"])
        .nullable(),
    }),
    slots: ["default"],
    description: "Flex container for layouts",
    example: { direction: "vertical", gap: "md" },
  },

  Grid: {
    props: z.object({
      columns: z.number().nullable(),
      gap: z.enum(["sm", "md", "lg"]).nullable(),
    }),
    slots: ["default"],
    description: "Grid layout (1-6 columns)",
    example: { columns: 3, gap: "md" },
  },

  Separator: {
    props: z.object({
      orientation: z.enum(["horizontal", "vertical"]).nullable(),
    }),
    description: "Visual separator line",
  },

  Tabs: {
    props: z.object({
      tabs: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      defaultValue: z.string().nullable(),
      value: z.string().nullable(),
    }),
    slots: ["default"],
    events: ["change"],
    description:
      "Tab navigation. Use { $bindState } on value for active tab binding.",
  },

  Accordion: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string(),
          content: z.string(),
        }),
      ),
      type: z.enum(["single", "multiple"]).nullable(),
    }),
    description:
      "Collapsible sections. Items as [{title, content}]. Type 'single' (default) or 'multiple'.",
  },

  Collapsible: {
    props: z.object({
      title: z.string(),
      defaultOpen: z.boolean().nullable(),
    }),
    slots: ["default"],
    description: "Collapsible section with trigger. Children render inside.",
  },

  Dialog: {
    props: z.object({
      title: z.string(),
      description: z.string().nullable(),
      openPath: z.string(),
    }),
    slots: ["default"],
    description:
      "Modal dialog. Set openPath to a boolean state path. Use setState to toggle.",
  },

  Drawer: {
    props: z.object({
      title: z.string(),
      description: z.string().nullable(),
      openPath: z.string(),
    }),
    slots: ["default"],
    description:
      "Bottom sheet drawer. Set openPath to a boolean state path. Use setState to toggle.",
  },

  Carousel: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string().nullable(),
          description: z.string().nullable(),
        }),
      ),
    }),
    description: "Horizontally scrollable carousel of cards.",
  },

  // ==========================================================================
  // Data Display Components
  // ==========================================================================

  Table: {
    props: z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      caption: z.string().nullable(),
    }),
    description:
      'Data table. columns: header labels. rows: 2D array of cell strings, e.g. [["Alice","admin"],["Bob","user"]].',
    example: {
      columns: ["Name", "Role"],
      rows: [
        ["Alice", "Admin"],
        ["Bob", "User"],
      ],
    },
  },

  Heading: {
    props: z.object({
      text: z.string(),
      level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
    }),
    description: "Heading text (h1-h4)",
    example: { text: "Welcome", level: "h1" },
  },

  Text: {
    props: z.object({
      text: z.string(),
      variant: z.enum(["body", "caption", "muted", "lead", "code"]).nullable(),
    }),
    description: "Paragraph text",
    example: { text: "Hello, world!" },
  },

  Image: {
    props: z.object({
      src: z.string().nullable(),
      alt: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
    }),
    description:
      "Image component. Renders an img tag when src is provided, otherwise a placeholder.",
  },

  Avatar: {
    props: z.object({
      src: z.string().nullable(),
      name: z.string(),
      size: z.enum(["sm", "md", "lg"]).nullable(),
    }),
    description: "User avatar with fallback initials",
    example: { name: "Jane Doe", size: "md" },
  },

  Badge: {
    props: z.object({
      text: z.string(),
      variant: z
        .enum(["default", "secondary", "destructive", "outline"])
        .nullable(),
    }),
    description: "Status badge",
    example: { text: "Active", variant: "default" },
  },

  Alert: {
    props: z.object({
      title: z.string(),
      message: z.string().nullable(),
      type: z.enum(["info", "success", "warning", "error"]).nullable(),
    }),
    description: "Alert banner",
    example: {
      title: "Note",
      message: "Your changes have been saved.",
      type: "success",
    },
  },

  Progress: {
    props: z.object({
      value: z.number(),
      max: z.number().nullable(),
      label: z.string().nullable(),
    }),
    description: "Progress bar (value 0-100)",
    example: { value: 65, max: 100, label: "Upload progress" },
  },

  Skeleton: {
    props: z.object({
      width: z.string().nullable(),
      height: z.string().nullable(),
      rounded: z.boolean().nullable(),
    }),
    description: "Loading placeholder skeleton",
  },

  Spinner: {
    props: z.object({
      size: z.enum(["sm", "md", "lg"]).nullable(),
      label: z.string().nullable(),
    }),
    description: "Loading spinner indicator",
  },

  Tooltip: {
    props: z.object({
      content: z.string(),
      text: z.string(),
    }),
    description: "Hover tooltip. Shows content on hover over text.",
  },

  Popover: {
    props: z.object({
      trigger: z.string(),
      content: z.string(),
    }),
    description: "Popover that appears on click of trigger.",
  },

  // ==========================================================================
  // Form Input Components
  // ==========================================================================

  Input: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      type: z.enum(["text", "email", "password", "number"]).nullable(),
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["submit", "focus", "blur"],
    description:
      "Text input field. Use { $bindState } on value for two-way binding. Use checks for validation (e.g. required, email, minLength). validateOn controls timing (default: blur).",
    example: {
      label: "Email",
      name: "email",
      type: "email",
      placeholder: "you@example.com",
    },
  },

  Textarea: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      placeholder: z.string().nullable(),
      rows: z.number().nullable(),
      value: z.string().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    description:
      "Multi-line text input. Use { $bindState } on value for binding. Use checks for validation. validateOn controls timing (default: blur).",
  },

  Select: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      options: z.array(z.string()),
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description:
      "Dropdown select input. Use { $bindState } on value for binding. Use checks for validation. validateOn controls timing (default: change).",
  },

  Checkbox: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      checked: z.boolean().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description:
      "Checkbox input. Use { $bindState } on checked for binding. Use checks for validation. validateOn controls timing (default: change).",
  },

  Radio: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      options: z.array(z.string()),
      value: z.string().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description:
      "Radio button group. Use { $bindState } on value for binding. Use checks for validation. validateOn controls timing (default: change).",
  },

  Switch: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      checked: z.boolean().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description:
      "Toggle switch. Use { $bindState } on checked for binding. Use checks for validation. validateOn controls timing (default: change).",
  },

  Slider: {
    props: z.object({
      label: z.string().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
      step: z.number().nullable(),
      value: z.number().nullable(),
    }),
    events: ["change"],
    description: "Range slider input. Use { $bindState } on value for binding.",
  },

  // ==========================================================================
  // Action Components
  // ==========================================================================

  Button: {
    props: z.object({
      label: z.string(),
      variant: z.enum(["primary", "secondary", "danger"]).nullable(),
      disabled: z.boolean().nullable(),
    }),
    events: ["press"],
    description: "Clickable button. Bind on.press for handler.",
    example: { label: "Submit", variant: "primary" },
  },

  Link: {
    props: z.object({
      label: z.string(),
      href: z.string(),
    }),
    events: ["press"],
    description: "Anchor link. Bind on.press for click handler.",
  },

  DropdownMenu: {
    props: z.object({
      label: z.string(),
      items: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      value: z.string().nullable(),
    }),
    events: ["select"],
    description:
      "Dropdown menu with trigger button and selectable items. Use { $bindState } on value for selected item binding.",
  },

  Toggle: {
    props: z.object({
      label: z.string(),
      pressed: z.boolean().nullable(),
      variant: z.enum(["default", "outline"]).nullable(),
    }),
    events: ["change"],
    description:
      "Toggle button. Use { $bindState } on pressed for state binding.",
  },

  ToggleGroup: {
    props: z.object({
      items: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      type: z.enum(["single", "multiple"]).nullable(),
      value: z.string().nullable(),
    }),
    events: ["change"],
    description:
      "Group of toggle buttons. Type 'single' (default) or 'multiple'. Use { $bindState } on value.",
  },

  ButtonGroup: {
    props: z.object({
      buttons: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      selected: z.string().nullable(),
    }),
    events: ["change"],
    description:
      "Segmented button group. Use { $bindState } on selected for selected value.",
  },

  Pagination: {
    props: z.object({
      totalPages: z.number(),
      page: z.number().nullable(),
    }),
    events: ["change"],
    description:
      "Page navigation. Use { $bindState } on page for current page number.",
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
  slots?: string[];
  events?: string[];
  description: string;
  example?: Record<string, unknown>;
};

/**
 * Infer the props type for a shadcn component by name.
 * Derives the TypeScript type directly from the Zod schema,
 * so component implementations stay in sync with catalog definitions.
 *
 * @example
 * ```ts
 * type CardProps = ShadcnProps<"Card">;
 * // { title: string | null; description: string | null; ... }
 * ```
 */
export type ShadcnProps<K extends keyof typeof shadcnComponentDefinitions> =
  z.output<(typeof shadcnComponentDefinitions)[K]["props"]>;

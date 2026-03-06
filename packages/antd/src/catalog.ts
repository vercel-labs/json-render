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
// Ant Design Component Definitions
// =============================================================================

/**
 * Ant Design component definitions for json-render catalogs.
 *
 * These can be used directly or extended with custom components.
 * All components are built using Ant Design components.
 */
export const antdComponentDefinitions = {
  // ==========================================================================
  // Layout Components
  // ==========================================================================

  Card: {
    props: z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      bordered: z.boolean().nullable(),
      hoverable: z.boolean().nullable(),
      loading: z.boolean().nullable(),
      size: z.enum(["default", "small"]).nullable(),
    }),
    slots: ["default"],
    description:
      "Container card for content sections. Use for forms/content boxes.",
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
      wrap: z.boolean().nullable(),
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

  Divider: {
    props: z.object({
      orientation: z.enum(["horizontal", "vertical"]).nullable(),
      dashed: z.boolean().nullable(),
      text: z.string().nullable(),
    }),
    description: "A divider line that separates content.",
  },

  Space: {
    props: z.object({
      direction: z.enum(["horizontal", "vertical"]).nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
      wrap: z.boolean().nullable(),
      align: z.enum(["start", "center", "end", "baseline"]).nullable(),
    }),
    slots: ["default"],
    description: "Set components spacing with Ant Design Space component.",
  },

  // ==========================================================================
  // Navigation Components
  // ==========================================================================

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
      position: z.enum(["top", "bottom", "left", "right"]).nullable(),
      type: z.enum(["line", "card"]).nullable(),
    }),
    slots: ["default"],
    events: ["change"],
    description:
      "Tab navigation. Use { $bindState } on value for active tab binding.",
  },

  Collapse: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string(),
          content: z.string(),
        }),
      ),
      accordion: z.boolean().nullable(),
    }),
    description:
      "Collapsible sections. Items as [{title, content}]. Set accordion to true for single panel open.",
  },

  Menu: {
    props: z.object({
      items: z.array(
        z.object({
          label: z.string(),
          key: z.string(),
          icon: z.string().nullable(),
        }),
      ),
      mode: z.enum(["horizontal", "vertical", "inline"]).nullable(),
      selectedKey: z.string().nullable(),
    }),
    events: ["select"],
    description: "Navigation menu with items.",
  },

  // ==========================================================================
  // Overlay Components
  // ==========================================================================

  Modal: {
    props: z.object({
      title: z.string(),
      description: z.string().nullable(),
      openPath: z.string(),
      width: z.number().nullable(),
      footer: z.boolean().nullable(),
    }),
    slots: ["default"],
    events: ["ok", "cancel"],
    description:
      "Modal dialog. Set openPath to a boolean state path. Use setState to toggle.",
  },

  Drawer: {
    props: z.object({
      title: z.string(),
      description: z.string().nullable(),
      openPath: z.string(),
      placement: z.enum(["top", "bottom", "left", "right"]).nullable(),
      width: z.union([z.number(), z.string()]).nullable(),
    }),
    slots: ["default"],
    events: ["close"],
    description: "Side drawer panel. Set openPath to a boolean state path.",
  },

  Popover: {
    props: z.object({
      trigger: z.string(),
      content: z.string(),
      placement: z.enum(["top", "bottom", "left", "right"]).nullable(),
    }),
    description: "Popover that appears on click of trigger.",
  },

  Tooltip: {
    props: z.object({
      content: z.string(),
      text: z.string(),
      placement: z.enum(["top", "bottom", "left", "right"]).nullable(),
    }),
    description: "Hover tooltip. Shows content on hover over text.",
  },

  Dropdown: {
    props: z.object({
      label: z.string(),
      items: z.array(
        z.object({
          label: z.string(),
          key: z.string(),
          icon: z.string().nullable(),
          danger: z.boolean().nullable(),
        }),
      ),
    }),
    events: ["select"],
    description: "Dropdown menu with trigger button and selectable items.",
  },

  // ==========================================================================
  // Data Display Components
  // ==========================================================================

  Table: {
    props: z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      caption: z.string().nullable(),
      bordered: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
      loading: z.boolean().nullable(),
    }),
    description:
      "Data table. columns: header labels. rows: 2D array of cell strings.",
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
      level: z.enum(["h1", "h2", "h3", "h4", "h5"]).nullable(),
    }),
    description: "Heading text (h1-h5)",
    example: { text: "Welcome", level: "h1" },
  },

  Text: {
    props: z.object({
      text: z.string(),
      type: z.enum(["secondary", "success", "warning", "danger"]).nullable(),
      code: z.boolean().nullable(),
      copyable: z.boolean().nullable(),
      delete: z.boolean().nullable(),
      mark: z.boolean().nullable(),
      underline: z.boolean().nullable(),
      strong: z.boolean().nullable(),
      italic: z.boolean().nullable(),
    }),
    description: "Text with various styles",
    example: { text: "Hello, world!", strong: true },
  },

  Paragraph: {
    props: z.object({
      text: z.string(),
      ellipsis: z.boolean().nullable(),
      rows: z.number().nullable(),
    }),
    description: "Paragraph text with optional ellipsis",
  },

  Image: {
    props: z.object({
      src: z.string().nullable(),
      alt: z.string(),
      width: z.union([z.number(), z.string()]).nullable(),
      height: z.union([z.number(), z.string()]).nullable(),
      preview: z.boolean().nullable(),
    }),
    description: "Image component with preview support.",
  },

  Avatar: {
    props: z.object({
      src: z.string().nullable(),
      name: z.string(),
      size: z
        .union([z.number(), z.enum(["small", "default", "large"])])
        .nullable(),
      shape: z.enum(["circle", "square"]).nullable(),
    }),
    description: "User avatar with fallback initials",
    example: { name: "Jane Doe", size: "default" },
  },

  Badge: {
    props: z.object({
      text: z.string().nullable(),
      count: z.number().nullable(),
      color: z.string().nullable(),
      status: z
        .enum(["success", "processing", "default", "error", "warning"])
        .nullable(),
    }),
    slots: ["default"],
    description: "Status badge or count indicator",
    example: { count: 5 },
  },

  Tag: {
    props: z.object({
      text: z.string(),
      color: z.string().nullable(),
      closable: z.boolean().nullable(),
    }),
    events: ["close"],
    description: "Tag for categorizing or marking.",
    example: { text: "Active", color: "green" },
  },

  Alert: {
    props: z.object({
      title: z.string(),
      message: z.string().nullable(),
      type: z.enum(["info", "success", "warning", "error"]).nullable(),
      closable: z.boolean().nullable(),
      showIcon: z.boolean().nullable(),
    }),
    events: ["close"],
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
      status: z.enum(["success", "exception", "normal", "active"]).nullable(),
      type: z.enum(["line", "circle", "dashboard"]).nullable(),
    }),
    description: "Progress bar (value 0-100)",
    example: { value: 65, max: 100, label: "Upload progress" },
  },

  Skeleton: {
    props: z.object({
      loading: z.boolean().nullable(),
      active: z.boolean().nullable(),
      rows: z.number().nullable(),
    }),
    slots: ["default"],
    description: "Loading placeholder skeleton",
  },

  Spin: {
    props: z.object({
      size: z.enum(["small", "default", "large"]).nullable(),
      label: z.string().nullable(),
      spinning: z.boolean().nullable(),
    }),
    slots: ["default"],
    description: "Loading spinner indicator",
  },

  Empty: {
    props: z.object({
      description: z.string().nullable(),
    }),
    description: "Empty state placeholder",
  },

  Statistic: {
    props: z.object({
      title: z.string(),
      value: z.union([z.number(), z.string()]),
      prefix: z.string().nullable(),
      suffix: z.string().nullable(),
    }),
    description: "Display statistic value with title",
  },

  Descriptions: {
    props: z.object({
      title: z.string().nullable(),
      items: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      bordered: z.boolean().nullable(),
      column: z.number().nullable(),
    }),
    description: "Display read-only data in key-value pairs",
  },

  Timeline: {
    props: z.object({
      items: z.array(
        z.object({
          content: z.string(),
          color: z.string().nullable(),
        }),
      ),
    }),
    description: "Vertical timeline display",
  },

  Carousel: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string().nullable(),
          description: z.string().nullable(),
        }),
      ),
      autoplay: z.boolean().nullable(),
      dots: z.boolean().nullable(),
    }),
    description: "Horizontally scrollable carousel.",
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
      prefix: z.string().nullable(),
      suffix: z.string().nullable(),
      allowClear: z.boolean().nullable(),
      showCount: z.boolean().nullable(),
      maxLength: z.number().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
      status: z.enum(["error", "warning"]).nullable(),
    }),
    events: ["submit", "focus", "blur", "change"],
    description:
      "Text input field. Use { $bindState } on value for two-way binding. Use checks for validation.",
    example: {
      label: "Email",
      name: "email",
      type: "email",
      placeholder: "you@example.com",
    },
  },

  TextArea: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      placeholder: z.string().nullable(),
      rows: z.number().nullable(),
      value: z.string().nullable(),
      allowClear: z.boolean().nullable(),
      showCount: z.boolean().nullable(),
      maxLength: z.number().nullable(),
      autoSize: z
        .union([
          z.boolean(),
          z.object({ minRows: z.number(), maxRows: z.number() }),
        ])
        .nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    description:
      "Multi-line text input. Use { $bindState } on value for binding.",
  },

  InputNumber: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      placeholder: z.string().nullable(),
      value: z.number().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
      step: z.number().nullable(),
      precision: z.number().nullable(),
      prefix: z.string().nullable(),
      suffix: z.string().nullable(),
    }),
    events: ["change"],
    description: "Number input with controls.",
  },

  Select: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      options: z.array(
        z.union([
          z.string(),
          z.object({ label: z.string(), value: z.string() }),
        ]),
      ),
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      mode: z.enum(["multiple", "tags"]).nullable(),
      allowClear: z.boolean().nullable(),
      showSearch: z.boolean().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description:
      "Dropdown select input. Use { $bindState } on value for binding.",
  },

  Checkbox: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      checked: z.boolean().nullable(),
      indeterminate: z.boolean().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description: "Checkbox input. Use { $bindState } on checked for binding.",
  },

  CheckboxGroup: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      options: z.array(
        z.union([
          z.string(),
          z.object({ label: z.string(), value: z.string() }),
        ]),
      ),
      value: z.array(z.string()).nullable(),
    }),
    events: ["change"],
    description: "Group of checkboxes.",
  },

  Radio: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      options: z.array(
        z.union([
          z.string(),
          z.object({ label: z.string(), value: z.string() }),
        ]),
      ),
      value: z.string().nullable(),
      optionType: z.enum(["default", "button"]).nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description: "Radio button group. Use { $bindState } on value for binding.",
  },

  Switch: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      checked: z.boolean().nullable(),
      checkedChildren: z.string().nullable(),
      unCheckedChildren: z.string().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description: "Toggle switch. Use { $bindState } on checked for binding.",
  },

  Slider: {
    props: z.object({
      label: z.string().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
      step: z.number().nullable(),
      value: z.union([z.number(), z.array(z.number())]).nullable(),
      range: z.boolean().nullable(),
      marks: z
        .record(
          z.string(),
          z.union([
            z.string(),
            z.object({ style: z.any(), label: z.string() }),
          ]),
        )
        .nullable(),
    }),
    events: ["change"],
    description: "Range slider input. Use { $bindState } on value for binding.",
  },

  Rate: {
    props: z.object({
      label: z.string().nullable(),
      count: z.number().nullable(),
      value: z.number().nullable(),
      allowHalf: z.boolean().nullable(),
      allowClear: z.boolean().nullable(),
    }),
    events: ["change"],
    description: "Star rating component.",
  },

  DatePicker: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      format: z.string().nullable(),
      picker: z.enum(["date", "week", "month", "quarter", "year"]).nullable(),
      showTime: z.boolean().nullable(),
    }),
    events: ["change"],
    description: "Date picker input.",
  },

  TimePicker: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      format: z.string().nullable(),
    }),
    events: ["change"],
    description: "Time picker input.",
  },

  Upload: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      accept: z.string().nullable(),
      multiple: z.boolean().nullable(),
      maxCount: z.number().nullable(),
      listType: z.enum(["text", "picture", "picture-card"]).nullable(),
      buttonText: z.string().nullable(),
    }),
    events: ["change"],
    description: "File upload component.",
  },

  Transfer: {
    props: z.object({
      label: z.string(),
      dataSource: z.array(
        z.object({
          key: z.string(),
          title: z.string(),
          description: z.string().nullable(),
        }),
      ),
      targetKeys: z.array(z.string()).nullable(),
      titles: z.array(z.string()).nullable(),
    }),
    events: ["change"],
    description: "Transfer items between two columns.",
  },

  // ==========================================================================
  // Action Components
  // ==========================================================================

  Button: {
    props: z.object({
      label: z.string(),
      type: z.enum(["primary", "default", "dashed", "text", "link"]).nullable(),
      danger: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
      loading: z.boolean().nullable(),
      icon: z.string().nullable(),
      block: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
    }),
    events: ["press"],
    description: "Clickable button. Bind on.press for handler.",
    example: { label: "Submit", type: "primary" },
  },

  ButtonGroup: {
    props: z.object({
      buttons: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          type: z
            .enum(["primary", "default", "dashed", "text", "link"])
            .nullable(),
        }),
      ),
      selected: z.string().nullable(),
    }),
    events: ["change"],
    description:
      "Segmented button group. Use { $bindState } on selected for selected value.",
  },

  Link: {
    props: z.object({
      label: z.string(),
      href: z.string(),
      target: z.enum(["_blank", "_self", "_parent", "_top"]).nullable(),
      disabled: z.boolean().nullable(),
    }),
    events: ["press"],
    description: "Anchor link. Bind on.press for click handler.",
  },

  Pagination: {
    props: z.object({
      total: z.number(),
      pageSize: z.number().nullable(),
      current: z.number().nullable(),
      showSizeChanger: z.boolean().nullable(),
      showQuickJumper: z.boolean().nullable(),
      simple: z.boolean().nullable(),
    }),
    events: ["change"],
    description:
      "Page navigation. Use { $bindState } on current for current page number.",
  },

  Segmented: {
    props: z.object({
      options: z.array(
        z.union([
          z.string(),
          z.object({
            label: z.string(),
            value: z.string(),
            icon: z.string().nullable(),
          }),
        ]),
      ),
      value: z.string().nullable(),
      block: z.boolean().nullable(),
    }),
    events: ["change"],
    description: "Segmented control for toggling between options.",
  },

  Steps: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string(),
          description: z.string().nullable(),
          icon: z.string().nullable(),
        }),
      ),
      current: z.number().nullable(),
      direction: z.enum(["horizontal", "vertical"]).nullable(),
      status: z.enum(["wait", "process", "finish", "error"]).nullable(),
    }),
    events: ["change"],
    description: "Step navigation bar.",
  },

  Result: {
    props: z.object({
      status: z
        .enum(["success", "error", "info", "warning", "404", "403", "500"])
        .nullable(),
      title: z.string(),
      subTitle: z.string().nullable(),
    }),
    slots: ["default"],
    description: "Result page for success/error states.",
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
 * Infer the props type for an antd component by name.
 * Derives the TypeScript type directly from the Zod schema,
 * so component implementations stay in sync with catalog definitions.
 *
 * @example
 * ```ts
 * type CardProps = AntdProps<"Card">;
 * // { title: string | null; description: string | null; ... }
 * ```
 */
export type AntdProps<K extends keyof typeof antdComponentDefinitions> =
  z.output<(typeof antdComponentDefinitions)[K]["props"]>;

/**
 * Bindings configuration for state binding paths.
 * Used for two-way data binding with state management.
 */
export type BindingsConfig = {
  [key: string]: string | undefined;
};

/**
 * Event emit function type
 */
export type EmitFunction = (eventName: string) => void;

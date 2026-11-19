import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * Web playground component catalog
 *
 * This defines the components available for AI generation in the playground.
 * Components and actions are implemented in lib/registry.tsx via defineRegistry.
 *
 * Keep schemas simple — one format per prop, no unions.
 * Fewer components = less confusion for the AI.
 */
export const playgroundCatalog = defineCatalog(schema, {
  components: {
    // ── Layout ──────────────────────────────────────────────────────────
    Card: {
      props: z.object({
        title: z.string().nullish(),
        description: z.string().nullish(),
        maxWidth: z.enum(["sm", "md", "lg", "full"]).nullish(),
        centered: z.boolean().nullish(),
      }),
      slots: ["default"],
      description:
        "Container card for content sections. Use for forms/content boxes, NOT for page headers.",
      example: { title: "Overview", description: "Your account summary" },
    },

    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).nullish(),
        gap: z.enum(["none", "sm", "md", "lg"]).nullish(),
        align: z.enum(["start", "center", "end", "stretch"]).nullish(),
        justify: z
          .enum(["start", "center", "end", "between", "around"])
          .nullish(),
      }),
      slots: ["default"],
      description: "Flex container for layouts",
      example: { direction: "vertical", gap: "md" },
    },

    Grid: {
      props: z.object({
        columns: z.number().nullish(),
        gap: z.enum(["sm", "md", "lg"]).nullish(),
      }),
      slots: ["default"],
      description: "Grid layout (1-6 columns)",
      example: { columns: 3, gap: "md" },
    },

    Separator: {
      props: z.object({
        orientation: z.enum(["horizontal", "vertical"]).nullish(),
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
        defaultValue: z.string().nullish(),
        value: z.string().nullish(),
      }),
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
        type: z.enum(["single", "multiple"]).nullish(),
      }),
      description:
        "Collapsible sections. Items as [{title, content}]. Type 'single' (default) or 'multiple'.",
    },

    Collapsible: {
      props: z.object({
        title: z.string(),
        defaultOpen: z.boolean().nullish(),
      }),
      slots: ["default"],
      description: "Collapsible section with trigger. Children render inside.",
    },

    Dialog: {
      props: z.object({
        title: z.string(),
        description: z.string().nullish(),
        openPath: z.string(),
      }),
      slots: ["default"],
      description:
        "Modal dialog. Set openPath to a boolean state path. Use setState to toggle.",
    },

    Drawer: {
      props: z.object({
        title: z.string(),
        description: z.string().nullish(),
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
            title: z.string().nullish(),
            description: z.string().nullish(),
          }),
        ),
      }),
      description: "Horizontally scrollable carousel of cards.",
    },

    // ── Data Display ────────────────────────────────────────────────────
    Table: {
      props: z.object({
        columns: z.array(z.string()),
        rows: z.array(z.array(z.string())),
        caption: z.string().nullish(),
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
        level: z.enum(["h1", "h2", "h3", "h4"]).nullish(),
      }),
      description: "Heading text (h1-h4)",
      example: { text: "Welcome", level: "h1" },
    },

    Text: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["body", "caption", "muted", "lead", "code"]).nullish(),
      }),
      description:
        'Paragraph text. In repeat scopes, use { "$template": "${field1} ${field2}" } to interpolate item fields.',
      example: { text: "Hello, world!" },
    },

    Image: {
      props: z.object({
        alt: z.string(),
        width: z.number().nullish(),
        height: z.number().nullish(),
      }),
      description: "Placeholder image (displays alt text in a styled box)",
    },

    Icon: {
      props: z.object({
        name: z.string(),
        size: z.enum(["sm", "md", "lg"]).nullish(),
        color: z
          .enum(["default", "muted", "primary", "success", "warning", "danger"])
          .nullish(),
      }),
      description:
        "Lucide icon by name. PascalCase: MapPin, Mail, Globe, Calendar, Star, Heart, Check, X, ArrowRight, Phone, Building, Clock, Shield, Zap, Users, Eye, Download, Upload, Search, Filter, Settings, Bell, ChevronRight, ExternalLink, Info, AlertTriangle, CheckCircle, XCircle. Use in horizontal Stacks with Text for icon+label patterns. Never use emoji — always use Icon.",
    },

    Avatar: {
      props: z.object({
        src: z.string().nullish(),
        name: z.string(),
        size: z.enum(["sm", "md", "lg"]).nullish(),
      }),
      description: "User avatar with fallback initials",
      example: { name: "Jane Doe", size: "md" },
    },

    Badge: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["default", "success", "warning", "danger"]).nullish(),
      }),
      description: "Status badge",
      example: { text: "Active", variant: "success" },
    },

    Alert: {
      props: z.object({
        title: z.string(),
        message: z.string().nullish(),
        type: z.enum(["info", "success", "warning", "error"]).nullish(),
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
        max: z.number().nullish(),
        label: z.string().nullish(),
      }),
      description: "Progress bar (value 0-100)",
      example: { value: 65, max: 100, label: "Upload progress" },
    },

    Skeleton: {
      props: z.object({
        width: z.string().nullish(),
        height: z.string().nullish(),
        rounded: z.boolean().nullish(),
      }),
      description: "Loading placeholder skeleton",
    },

    Spinner: {
      props: z.object({
        size: z.enum(["sm", "md", "lg"]).nullish(),
        label: z.string().nullish(),
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

    Rating: {
      props: z.object({
        value: z.number(),
        max: z.number().nullish(),
        label: z.string().nullish(),
        interactive: z.boolean().nullish(),
      }),
      events: ["change"],
      description:
        "Interactive star rating. Use { $bindState } on value for binding. Set interactive: false for read-only display.",
      example: { value: 4, max: 5, label: "Rating" },
    },

    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        change: z.string().nullish(),
        changeType: z.enum(["positive", "negative", "neutral"]).nullish(),
        prefix: z.string().nullish(),
        suffix: z.string().nullish(),
      }),
      description:
        "Key metric / stat display. Shows a large value with label and optional change indicator. Use for dashboard KPIs.",
      example: {
        label: "Total Revenue",
        value: "125,000",
        prefix: "$",
        change: "+12.5%",
        changeType: "positive",
      },
    },

    // ── Charts ──────────────────────────────────────────────────────────
    BarGraph: {
      props: z.object({
        title: z.string().nullish(),
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
          }),
        ),
      }),
      description: "Vertical bar chart",
    },

    LineGraph: {
      props: z.object({
        title: z.string().nullish(),
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
          }),
        ),
      }),
      description: "Line chart with points",
    },

    // ── Form Inputs ─────────────────────────────────────────────────────
    Input: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        type: z.enum(["text", "email", "password", "number"]).nullish(),
        placeholder: z.string().nullish(),
        value: z.string().nullish(),
        checks: z
          .array(
            z.object({
              type: z.string(),
              message: z.string(),
              args: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .nullish(),
      }),
      events: ["submit", "focus", "blur"],
      description:
        "Text input field. Use { $bindState } on value for two-way binding. Use checks for validation (e.g. required, email, minLength).",
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
        placeholder: z.string().nullish(),
        rows: z.number().nullish(),
        value: z.string().nullish(),
        checks: z
          .array(
            z.object({
              type: z.string(),
              message: z.string(),
              args: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .nullish(),
      }),
      description:
        "Multi-line text input. Use { $bindState } on value for binding. Use checks for validation.",
    },

    Select: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(z.string()),
        placeholder: z.string().nullish(),
        value: z.string().nullish(),
        checks: z
          .array(
            z.object({
              type: z.string(),
              message: z.string(),
              args: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .nullish(),
      }),
      events: ["change"],
      description:
        "Dropdown select input. Use { $bindState } on value for binding. Use checks for validation.",
    },

    Checkbox: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().nullish(),
      }),
      events: ["change"],
      description: "Checkbox input. Use { $bindState } on checked for binding.",
    },

    Radio: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(z.string()),
        value: z.string().nullish(),
      }),
      events: ["change"],
      description:
        "Radio button group. Use { $bindState } on value for binding.",
    },

    Switch: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().nullish(),
      }),
      events: ["change"],
      description: "Toggle switch. Use { $bindState } on checked for binding.",
    },

    Slider: {
      props: z.object({
        label: z.string().nullish(),
        min: z.number().nullish(),
        max: z.number().nullish(),
        step: z.number().nullish(),
        value: z.number().nullish(),
      }),
      events: ["change"],
      description:
        "Range slider input. Use { $bindState } on value for binding.",
    },

    // ── Actions ─────────────────────────────────────────────────────────
    Button: {
      props: z.object({
        label: z.string(),
        variant: z
          .enum(["primary", "secondary", "outline", "danger"])
          .nullish(),
        disabled: z.boolean().nullish(),
      }),
      events: ["press"],
      description:
        "Clickable button. primary = solid fill, outline = bordered/transparent, secondary = muted fill. Bind on.press for handler.",
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
      }),
      events: ["select"],
      description: "Dropdown menu with trigger button and selectable items.",
    },

    Toggle: {
      props: z.object({
        label: z.string(),
        pressed: z.boolean().nullish(),
        variant: z.enum(["default", "outline"]).nullish(),
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
        type: z.enum(["single", "multiple"]).nullish(),
        value: z.string().nullish(),
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
        selected: z.string().nullish(),
      }),
      events: ["change"],
      description:
        "Segmented button group. Use { $bindState } on selected for selected value.",
    },

    Pagination: {
      props: z.object({
        totalPages: z.number(),
        page: z.number().nullish(),
      }),
      events: ["change"],
      description:
        "Page navigation. Use { $bindState } on page for current page number.",
    },
  },

  actions: {
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
        'Append an item to an array in state. Value can contain {"$state":"/statePath"} refs and "$id" for auto IDs. clearStatePath resets another path after pushing.',
    },

    removeState: {
      params: z.object({
        statePath: z.string(),
        index: z.number(),
      }),
      description: "Remove an item from an array in state at the given index.",
    },

    buttonClick: {
      params: z.object({
        message: z.string().nullable(),
      }),
      description: "Shows a toast with the message.",
    },

    formSubmit: {
      params: z.object({
        formName: z.string().nullable(),
      }),
      description: "Shows a toast confirming form submission.",
    },

    linkClick: {
      params: z.object({
        href: z.string(),
      }),
      description: "Shows a toast with the link destination.",
    },
  },
});

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
// Ant Design v6 Component Definitions
// =============================================================================

/**
 * Ant Design v6 component definitions for json-render catalogs.
 *
 * These can be used directly or extended with custom components.
 * All components are built using Ant Design v6 components.
 *
 * Note: Component APIs follow Antd v6 specifications:
 * - Use `variant` instead of deprecated `bordered` where applicable
 * - Use `orientation` instead of deprecated `direction` where applicable
 * - Use `titlePlacement` for Divider text alignment
 * - Use `expandIconPlacement` instead of deprecated `expandIconPosition`
 */
export const antdComponentDefinitions = {
  // ==========================================================================
  // Layout Components
  // ==========================================================================

  Layout: {
    props: z.object({
      hasSider: z.boolean().nullable(),
    }),
    slots: ["default"],
    description:
      "Antd layout container. Compose with LayoutHeader / LayoutSider / LayoutContent / LayoutFooter inside.",
  },

  LayoutHeader: {
    props: z.object({}),
    slots: ["default"],
    description: "Antd layout header. Use inside Layout only.",
  },

  LayoutContent: {
    props: z.object({}),
    slots: ["default"],
    description: "Antd layout main content area. Use inside Layout only.",
  },

  LayoutFooter: {
    props: z.object({}),
    slots: ["default"],
    description: "Antd layout footer. Use inside Layout only.",
  },

  LayoutSider: {
    props: z.object({
      width: z.union([z.number(), z.string()]).nullable(),
      collapsible: z.boolean().nullable(),
      collapsed: z.boolean().nullable(),
      defaultCollapsed: z.boolean().nullable(),
      collapsedWidth: z.union([z.number(), z.string()]).nullable(),
      reverseArrow: z.boolean().nullable(),
      breakpoint: z.enum(["xs", "sm", "md", "lg", "xl", "xxl"]).nullable(),
      theme: z.enum(["light", "dark"]).nullable(),
    }),
    slots: ["default"],
    events: ["collapse"],
    description: "Antd layout sidebar. Use inside Layout only.",
  },

  Card: {
    props: z.object({
      title: z.string().nullable(),
      extra: z.string().nullable(),
      variant: z.enum(["outlined", "borderless"]).nullable(),
      hoverable: z.boolean().nullable(),
      loading: z.boolean().nullable(),
      size: z.enum(["default", "small"]).nullable(),
      cover: z.string().nullable(),
      actions: z.array(z.string()).nullable(),
    }),
    slots: ["default", "extra", "cover", "actions"],
    description:
      "Container card for content sections. Use slots.default for card body, slots.extra for header extra content, slots.cover for cover image, slots.actions for action buttons.",
    example: { title: "Overview", variant: "outlined" },
  },

  Flex: {
    props: z.object({
      vertical: z.boolean().nullable(),
      wrap: z.boolean().nullable(),
      justify: z.string().nullable(),
      align: z.string().nullable(),
      gap: z.union([z.string(), z.number()]).nullable(),
      flex: z.string().nullable(),
    }),
    slots: ["default"],
    description:
      "Flex layout container. justify/align accept CSS values (e.g. 'center', 'space-between'). gap accepts 'small'/'middle'/'large' or a number.",
    example: { vertical: true, gap: "middle" },
  },

  Stack: {
    props: z.object({
      direction: z.enum(["vertical", "horizontal"]).nullable(),
      wrap: z.boolean().nullable(),
      justify: z
        .enum([
          "start",
          "end",
          "center",
          "space-around",
          "space-between",
          "space-evenly",
        ])
        .nullable(),
      align: z
        .enum(["start", "center", "end", "baseline", "stretch"])
        .nullable(),
      gap: z
        .union([z.enum(["small", "middle", "large"]), z.number()])
        .nullable(),
    }),
    slots: ["default"],
    description:
      "Stack layout container based on Flex. Defaults to vertical direction.",
    example: { direction: "vertical", gap: "middle" },
  },

  Grid: {
    props: z.object({
      columns: z.number().nullable(),
      gap: z.enum(["sm", "md", "lg"]).nullable(),
    }),
    slots: ["default"],
    description: "Grid layout (1-6 columns). Antd v6.",
    example: { columns: 3, gap: "md" },
  },

  Row: {
    props: z.object({
      gutter: z
        .union([z.number(), z.tuple([z.number(), z.number()])])
        .nullable(),
      align: z.enum(["top", "middle", "bottom", "stretch"]).nullable(),
      justify: z
        .enum([
          "start",
          "end",
          "center",
          "space-around",
          "space-between",
          "space-evenly",
        ])
        .nullable(),
      wrap: z.boolean().nullable(),
    }),
    slots: ["default"],
    description:
      "Antd grid row. Use Col children inside. gutter: horizontal spacing (or [horizontal, vertical]).",
    example: { gutter: 16 },
  },

  Col: {
    props: z.object({
      span: z.number().nullable(),
      offset: z.number().nullable(),
      order: z.number().nullable(),
      push: z.number().nullable(),
      pull: z.number().nullable(),
      flex: z.union([z.number(), z.string()]).nullable(),
    }),
    slots: ["default"],
    description:
      "Antd grid column (span 1-24). Use inside Row. offset shifts the col right.",
    example: { span: 12 },
  },

  Masonry: {
    props: z.object({
      columns: z
        .union([z.number(), z.record(z.string(), z.number())])
        .nullable(),
      gutter: z
        .union([z.number(), z.tuple([z.number(), z.number()])])
        .nullable(),
    }),
    slots: ["default"],
    description:
      "Masonry layout. Children are automatically distributed across columns. columns can be number or responsive object like { xs: 1, sm: 2, md: 3 }.",
    example: { columns: 3, gutter: [16, 16] },
  },

  Divider: {
    props: z.object({
      orientation: z.enum(["horizontal", "vertical"]).nullable(),
      vertical: z.boolean().nullable(),
      titlePlacement: z
        .enum(["left", "center", "right", "start", "end"])
        .nullable(),
      dashed: z.boolean().nullable(),
      variant: z.enum(["solid", "dashed", "dotted"]).nullable(),
      plain: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
      text: z.string().nullable(),
    }),
    description: "A divider line that separates content.",
  },

  Space: {
    props: z.object({
      orientation: z.enum(["horizontal", "vertical"]).nullable(),
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

  Affix: {
    props: z.object({
      offsetBottom: z.number().nullable(),
      offsetTop: z.number().nullable(),
      target: z.string().nullable(),
    }),
    slots: ["default"],
    description:
      "Affix component. Pins children to a fixed position when scrolling.",
  },

  Anchor: {
    props: z.object({
      items: z.array(
        z.object({
          key: z.string(),
          title: z.string(),
          href: z.string().nullable(),
        }),
      ),
      affix: z.boolean().nullable(),
      bounds: z.number().nullable(),
      offsetTop: z.number().nullable(),
      targetOffset: z.number().nullable(),
    }),
    events: ["change", "click"],
    description: "Anchor navigation for page sections.",
  },

  Breadcrumb: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string(),
          href: z.string().nullable(),
        }),
      ),
      separator: z.string().nullable(),
    }),
    description: "Breadcrumb navigation path.",
  },

  BackTop: {
    props: z.object({
      visibilityHeight: z.number().nullable(),
      target: z.string().nullable(),
      duration: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Back to top button. Deprecated in antd v6, use FloatButton.BackTop instead.",
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
      position: z.enum(["top", "bottom", "left", "right"]).nullable(),
      type: z.enum(["line", "card"]).nullable(),
      centered: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
      tabBarGutter: z.number().nullable(),
      destroyInactiveTabPane: z.boolean().nullable(),
    }),
    slots: ["tabs"],
    events: ["change"],
    description:
      "Tab navigation. Use slots.tabs for tab content items. Use { $bindState } on value for active tab binding.",
  },

  Collapse: {
    props: z.object({
      items: z.array(
        z.object({
          title: z.string(),
        }),
      ),
      accordion: z.boolean().nullable(),
      bordered: z.boolean().nullable(),
      ghost: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
      expandIconPlacement: z.enum(["start", "end"]).nullable(),
      collapsible: z.enum(["header", "icon", "disabled"]).nullable(),
      defaultActiveKey: z.union([z.string(), z.array(z.string())]).nullable(),
      activeKey: z.union([z.string(), z.array(z.string())]).nullable(),
    }),
    slots: ["items"],
    description:
      "Collapsible sections. Each item has a title. Use slots.items for panel content.",
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
      theme: z.enum(["light", "dark"]).nullable(),
      defaultSelectedKeys: z.array(z.string()).nullable(),
      inlineCollapsed: z.boolean().nullable(),
      multiple: z.boolean().nullable(),
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
      centered: z.boolean().nullable(),
      closable: z.boolean().nullable(),
      maskClosable: z.boolean().nullable(),
      okText: z.string().nullable(),
      cancelText: z.string().nullable(),
      confirmLoading: z.boolean().nullable(),
      destroyOnClose: z.boolean().nullable(),
      keyboard: z.boolean().nullable(),
      loading: z.boolean().nullable(),
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
      height: z.union([z.number(), z.string()]).nullable(),
      closable: z.boolean().nullable(),
      maskClosable: z.boolean().nullable(),
      destroyOnClose: z.boolean().nullable(),
      keyboard: z.boolean().nullable(),
      loading: z.boolean().nullable(),
      size: z.enum(["default", "large"]).nullable(),
    }),
    slots: ["default"],
    events: ["close"],
    description: "Side drawer panel. Set openPath to a boolean state path.",
  },

  Popover: {
    props: z.object({
      trigger: z.string(),
      title: z.string().nullable(),
      content: z.string(),
      placement: z
        .enum([
          "top",
          "topLeft",
          "topRight",
          "bottom",
          "bottomLeft",
          "bottomRight",
          "left",
          "leftTop",
          "leftBottom",
          "right",
          "rightTop",
          "rightBottom",
        ])
        .nullable(),
      triggerType: z
        .enum(["hover", "focus", "click", "contextMenu"])
        .nullable(),
      arrow: z.boolean().nullable(),
      open: z.boolean().nullable(),
      defaultOpen: z.boolean().nullable(),
    }),
    description: "Popover that appears on click of trigger.",
  },

  Tooltip: {
    props: z.object({
      content: z.string(),
      text: z.string(),
      placement: z
        .enum([
          "top",
          "topLeft",
          "topRight",
          "bottom",
          "bottomLeft",
          "bottomRight",
          "left",
          "leftTop",
          "leftBottom",
          "right",
          "rightTop",
          "rightBottom",
        ])
        .nullable(),
      triggerType: z
        .enum(["hover", "focus", "click", "contextMenu"])
        .nullable(),
      arrow: z.boolean().nullable(),
      color: z.string().nullable(),
      open: z.boolean().nullable(),
      defaultOpen: z.boolean().nullable(),
    }),
    description: "Hover tooltip. Shows content on hover over text.",
  },

  Dropdown: {
    props: z.object({
      items: z.array(
        z.object({
          label: z.string(),
          key: z.string(),
          icon: z.string().nullable(),
          danger: z.boolean().nullable(),
          disabled: z.boolean().nullable(),
          divider: z.boolean().nullable(),
        }),
      ),
      trigger: z.enum(["hover", "click", "contextMenu"]).nullable(),
      placement: z
        .enum([
          "topLeft",
          "topCenter",
          "topRight",
          "bottomLeft",
          "bottomCenter",
          "bottomRight",
        ])
        .nullable(),
      arrow: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
      open: z.boolean().nullable(),
      defaultOpen: z.boolean().nullable(),
    }),
    slots: ["default"],
    events: ["select", "openChange", "visibleChange"],
    description: "Dropdown menu. Use children as trigger element.",
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
      pagination: z
        .union([
          z.boolean(),
          z.object({
            pageSize: z.number().nullable(),
            current: z.number().nullable(),
            total: z.number().nullable(),
            showSizeChanger: z.boolean().nullable(),
            showQuickJumper: z.boolean().nullable(),
            simple: z.boolean().nullable(),
            hideOnSinglePage: z.boolean().nullable(),
          }),
        ])
        .nullable(),
      scroll: z
        .object({
          x: z.union([z.number(), z.string()]).nullable(),
          y: z.union([z.number(), z.string()]).nullable(),
        })
        .nullable(),
      showHeader: z.boolean().nullable(),
      rowKey: z.string().nullable(),
      sticky: z.boolean().nullable(),
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
      src: z.string(),
      alt: z.string(),
      width: z.union([z.number(), z.string()]).nullable(),
      height: z.union([z.number(), z.string()]).nullable(),
      preview: z.boolean().nullable(),
      fallback: z.string().nullable(),
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
      icon: z.string().nullable(),
      alt: z.string().nullable(),
      gap: z.number().nullable(),
    }),
    description: "User avatar with fallback initials",
    example: { name: "Jane Doe", size: "default" },
  },

  Badge: {
    props: z.object({
      count: z.union([z.number(), z.string()]).nullable(),
      dot: z.boolean().nullable(),
      color: z.string().nullable(),
      status: z
        .enum(["success", "processing", "default", "error", "warning"])
        .nullable(),
      text: z.string().nullable(),
      size: z.enum(["default", "small"]).nullable(),
      overflowCount: z.number().nullable(),
      showZero: z.boolean().nullable(),
      title: z.string().nullable(),
      offset: z
        .tuple([
          z.union([z.number(), z.string()]),
          z.union([z.number(), z.string()]),
        ])
        .nullable(),
    }),
    slots: ["default"],
    description: "Badge component for status or count display",
    example: { count: 5 },
  },

  Tag: {
    props: z.object({
      text: z.string(),
      color: z.string().nullable(),
      closable: z.boolean().nullable(),
      bordered: z.boolean().nullable(),
      icon: z.string().nullable(),
    }),
    events: ["close"],
    description: "Tag for categorizing or marking.",
    example: { text: "Active", color: "green" },
  },

  Alert: {
    props: z.object({
      title: z.string(),
      description: z.string().nullable(),
      type: z.enum(["info", "success", "warning", "error"]).nullable(),
      closable: z.boolean().nullable(),
      showIcon: z.boolean().nullable(),
      banner: z.boolean().nullable(),
    }),
    events: ["close"],
    description: "Alert banner",
    example: {
      title: "Note",
      description: "Your changes have been saved.",
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
      showInfo: z.boolean().nullable(),
      strokeColor: z.string().nullable(),
      size: z.union([z.enum(["small", "default"]), z.number()]).nullable(),
      steps: z.number().nullable(),
    }),
    description: "Progress bar (value 0-100)",
    example: { value: 65, max: 100, label: "Upload progress" },
  },

  Skeleton: {
    props: z.object({
      loading: z.boolean().nullable(),
      active: z.boolean().nullable(),
      rows: z.number().nullable(),
      avatar: z.boolean().nullable(),
      title: z.boolean().nullable(),
      round: z.boolean().nullable(),
    }),
    slots: ["default"],
    description: "Loading placeholder skeleton",
  },

  Spin: {
    props: z.object({
      size: z.enum(["small", "default", "large"]).nullable(),
      label: z.string().nullable(),
      spinning: z.boolean().nullable(),
      delay: z.number().nullable(),
      fullscreen: z.boolean().nullable(),
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
      precision: z.number().nullable(),
      loading: z.boolean().nullable(),
      groupSeparator: z.string().nullable(),
      decimalSeparator: z.string().nullable(),
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
          span: z.number().nullable(),
        }),
      ),
      bordered: z.boolean().nullable(),
      column: z.number().nullable(),
      colon: z.boolean().nullable(),
      layout: z.enum(["horizontal", "vertical"]).nullable(),
      size: z.enum(["default", "middle", "small"]).nullable(),
    }),
    description: "Display read-only data in key-value pairs",
  },

  Timeline: {
    props: z.object({
      items: z.array(
        z.object({
          color: z.string().nullable(),
        }),
      ),
      mode: z.enum(["left", "alternate", "right"]).nullable(),
      reverse: z.boolean().nullable(),
    }),
    slots: ["items"],
    description:
      "Vertical timeline display. Use slots.items for each node's content.",
  },

  Carousel: {
    props: z.object({
      autoplay: z.boolean().nullable(),
      dots: z.boolean().nullable(),
      effect: z.enum(["scrollx", "fade"]).nullable(),
      autoplaySpeed: z.number().nullable(),
      speed: z.number().nullable(),
      infinite: z.boolean().nullable(),
      arrows: z.boolean().nullable(),
      dotPosition: z.enum(["top", "bottom", "left", "right"]).nullable(),
    }),
    slots: ["default"],
    description:
      "Horizontally scrollable carousel. Use slots for slide content.",
  },

  Calendar: {
    props: z.object({
      value: z.string().nullable(),
      mode: z.enum(["month", "year"]).nullable(),
      fullscreen: z.boolean().nullable(),
    }),
    events: ["change", "select"],
    description: "Calendar component for date display and selection.",
  },

  List: {
    props: z.object({
      dataSource: z.array(z.any()).nullable(),
      bordered: z.boolean().nullable(),
      loading: z.boolean().nullable(),
      size: z.enum(["small", "default", "large"]).nullable(),
      split: z.boolean().nullable(),
      grid: z
        .object({
          gutter: z.number().nullable(),
          column: z.number().nullable(),
        })
        .nullable(),
      pagination: z
        .union([
          z.boolean(),
          z.object({
            pageSize: z.number().nullable(),
            total: z.number().nullable(),
          }),
        ])
        .nullable(),
    }),
    slots: ["default"],
    events: ["change"],
    description: "List component. Use slots.default for list items.",
  },

  Tree: {
    props: z.object({
      treeData: z.array(
        z.object({
          key: z.string(),
          title: z.string(),
          children: z.array(z.any()).nullable(),
        }),
      ),
      checkable: z.boolean().nullable(),
      checkedKeys: z.array(z.string()).nullable(),
      expandedKeys: z.array(z.string()).nullable(),
      selectedKeys: z.array(z.string()).nullable(),
      defaultExpandAll: z.boolean().nullable(),
      showLine: z.boolean().nullable(),
      multiple: z.boolean().nullable(),
    }),
    events: ["check", "expand", "select"],
    description: "Tree structure display and selection.",
  },

  QRCode: {
    props: z.object({
      value: z.string(),
      size: z.number().nullable(),
      color: z.string().nullable(),
      bgColor: z.string().nullable(),
      bordered: z.boolean().nullable(),
      status: z.enum(["active", "expired", "loading"]).nullable(),
    }),
    description: "QRCode generator component.",
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
      size: z.enum(["small", "middle", "large"]).nullable(),
      variant: z.enum(["outlined", "borderless", "filled"]).nullable(),
      readOnly: z.boolean().nullable(),
      addonBefore: z.string().nullable(),
      addonAfter: z.string().nullable(),
      disabled: z.boolean().nullable(),
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
      size: z.enum(["small", "middle", "large"]).nullable(),
      variant: z.enum(["outlined", "borderless", "filled"]).nullable(),
      readOnly: z.boolean().nullable(),
      autoSize: z
        .union([
          z.boolean(),
          z.object({ minRows: z.number(), maxRows: z.number() }),
        ])
        .nullable(),
      disabled: z.boolean().nullable(),
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
      size: z.enum(["small", "middle", "large"]).nullable(),
      variant: z.enum(["outlined", "borderless", "filled"]).nullable(),
      disabled: z.boolean().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
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
      size: z.enum(["small", "middle", "large"]).nullable(),
      variant: z.enum(["outlined", "borderless", "filled"]).nullable(),
      disabled: z.boolean().nullable(),
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
      disabled: z.boolean().nullable(),
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
      disabled: z.boolean().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
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
      disabled: z.boolean().nullable(),
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
      disabled: z.boolean().nullable(),
      checks: validationCheckSchema,
      validateOn: validateOnSchema,
    }),
    events: ["change"],
    description: "Toggle switch. Use { $bindState } on checked for binding.",
  },

  Slider: {
    props: z.object({
      label: z.string().nullable(),
      name: z.string().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
      step: z.number().nullable(),
      value: z.union([z.number(), z.array(z.number())]).nullable(),
      range: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
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
      name: z.string().nullable(),
      count: z.number().nullable(),
      value: z.number().nullable(),
      allowHalf: z.boolean().nullable(),
      allowClear: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
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
      disabled: z.boolean().nullable(),
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
      disabled: z.boolean().nullable(),
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
      disabled: z.boolean().nullable(),
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
      disabled: z.boolean().nullable(),
    }),
    events: ["change"],
    description: "Transfer items between two columns.",
  },

  AutoComplete: {
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
      allowClear: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
      status: z.enum(["error", "warning"]).nullable(),
    }),
    events: ["change", "select"],
    description: "AutoComplete input with suggestions.",
  },

  Cascader: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      options: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          children: z.array(z.any()).nullable(),
        }),
      ),
      placeholder: z.string().nullable(),
      value: z.array(z.string()).nullable(),
      allowClear: z.boolean().nullable(),
      showSearch: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
    }),
    events: ["change"],
    description: "Cascader selection for hierarchical data.",
  },

  ColorPicker: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      value: z.string().nullable(),
      showText: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
      allowClear: z.boolean().nullable(),
      format: z.enum(["hex", "rgb", "hsl"]).nullable(),
    }),
    events: ["change"],
    description: "Color picker component.",
  },

  Mentions: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      options: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
        }),
      ),
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      autoSize: z
        .union([
          z.boolean(),
          z.object({ minRows: z.number(), maxRows: z.number() }),
        ])
        .nullable(),
      disabled: z.boolean().nullable(),
    }),
    events: ["change"],
    description: "Mentions input for @-tagging.",
  },

  TreeSelect: {
    props: z.object({
      label: z.string(),
      name: z.string(),
      treeData: z.array(
        z.object({
          key: z.string(),
          title: z.string(),
          value: z.string(),
          children: z.array(z.any()).nullable(),
        }),
      ),
      placeholder: z.string().nullable(),
      value: z.string().nullable(),
      allowClear: z.boolean().nullable(),
      showSearch: z.boolean().nullable(),
      multiple: z.boolean().nullable(),
      disabled: z.boolean().nullable(),
      treeCheckable: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
    }),
    events: ["change"],
    description: "Tree select dropdown component.",
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
      ghost: z.boolean().nullable(),
      shape: z.enum(["default", "circle", "round"]).nullable(),
      href: z.string().nullable(),
      target: z.enum(["_blank", "_self", "_parent", "_top"]).nullable(),
      htmlType: z.enum(["button", "submit", "reset"]).nullable(),
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
      disabled: z.boolean().nullable(),
      size: z.enum(["default", "small"]).nullable(),
      hideOnSinglePage: z.boolean().nullable(),
      pageSizeOptions: z.array(z.number()).nullable(),
      align: z.enum(["start", "center", "end"]).nullable(),
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
      disabled: z.boolean().nullable(),
      size: z.enum(["small", "middle", "large"]).nullable(),
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
          subTitle: z.string().nullable(),
          icon: z.string().nullable(),
          disabled: z.boolean().nullable(),
          status: z.enum(["wait", "process", "finish", "error"]).nullable(),
        }),
      ),
      current: z.number().nullable(),
      direction: z.enum(["horizontal", "vertical"]).nullable(),
      status: z.enum(["wait", "process", "finish", "error"]).nullable(),
      size: z.enum(["default", "small"]).nullable(),
      type: z.enum(["default", "navigation", "inline"]).nullable(),
      initial: z.number().nullable(),
      labelPlacement: z.enum(["horizontal", "vertical"]).nullable(),
      percent: z.number().nullable(),
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

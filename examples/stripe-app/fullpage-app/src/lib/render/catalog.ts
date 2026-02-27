import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * Stripe UIXT Catalog
 *
 * Comprehensive catalog mapping to Stripe UI Extension SDK components.
 */
export const stripeCatalog = defineCatalog(schema, {
  components: {
    // =========================================================================
    // Layout Components
    // =========================================================================
    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).default("vertical"),
        gap: z
          .enum(["xsmall", "small", "medium", "large", "xlarge"])
          .default("medium"),
        alignX: z.enum(["start", "center", "end", "stretch"]).nullable(),
        alignY: z
          .enum(["top", "center", "baseline", "bottom", "stretch"])
          .nullable(),
        distribute: z.enum(["space-between", "packed"]).nullable(),
      }),
      description:
        "Flex layout container for arranging children horizontally or vertically with configurable gap and alignment",
      example: { direction: "vertical", gap: "medium" },
    },

    Inline: {
      props: z.object({
        gap: z.enum(["xsmall", "small", "medium", "large"]).default("small"),
      }),
      description:
        "Inline layout for text and small elements that wrap naturally",
    },

    Divider: {
      props: z.object({}),
      description:
        "Visual horizontal divider line to separate content sections",
    },

    Accordion: {
      props: z.object({}),
      slots: ["default"],
      description:
        "Collapsible accordion container for expandable content sections",
    },

    AccordionItem: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
        defaultOpen: z.boolean().nullable(),
      }),
      slots: ["default"],
      description:
        "Individual accordion item with title, optional subtitle, and collapsible content",
    },

    // =========================================================================
    // Typography Components
    // =========================================================================
    Heading: {
      props: z.object({
        text: z.string(),
        size: z
          .enum(["xsmall", "small", "medium", "large", "xlarge"])
          .default("large"),
      }),
      description: "Display a heading/title text with configurable size",
      example: { text: "Overview", size: "large" },
    },

    Text: {
      props: z.object({
        content: z.string(),
        color: z
          .enum([
            "primary",
            "secondary",
            "disabled",
            "critical",
            "success",
            "warning",
            "info",
          ])
          .default("primary"),
        size: z.enum(["xsmall", "small", "medium", "large"]).default("medium"),
        weight: z
          .enum(["regular", "medium", "semibold", "bold"])
          .default("regular"),
      }),
      description:
        "Display body text with configurable color, size, and weight",
      example: { content: "Payment received successfully.", color: "primary" },
    },

    // =========================================================================
    // Data Display Components
    // =========================================================================
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        change: z.string().nullable(),
        changeType: z
          .enum(["positive", "negative", "neutral"])
          .default("neutral"),
        format: z.enum(["currency", "number", "percent"]).nullable(),
      }),
      description:
        "Display a key metric with label, value, and optional trend indicator for KPIs",
      example: {
        label: "Revenue",
        value: "$12,450",
        change: "+8.2%",
        changeType: "positive",
        format: "currency",
      },
    },

    Badge: {
      props: z.object({
        label: z.string(),
        type: z
          .enum([
            "neutral",
            "urgent",
            "warning",
            "negative",
            "positive",
            "info",
          ])
          .default("neutral"),
      }),
      description: "Status badge indicator with configurable color type",
      example: { label: "Active", type: "positive" },
    },

    Icon: {
      props: z.object({
        name: z.string(),
        size: z.enum(["xsmall", "small", "medium", "large"]).default("medium"),
        color: z
          .enum([
            "primary",
            "secondary",
            "disabled",
            "critical",
            "success",
            "warning",
            "info",
          ])
          .nullable(),
      }),
      description:
        "Display an icon from Stripe's icon set (e.g., 'check', 'warning', 'customer', 'payment')",
    },

    Img: {
      props: z.object({
        src: z.string(),
        alt: z.string().nullable(),
        width: z.number().nullable(),
        height: z.number().nullable(),
      }),
      description: "Display an image with configurable dimensions",
    },

    Spinner: {
      props: z.object({
        size: z.enum(["small", "medium", "large"]).default("medium"),
      }),
      description: "Loading spinner indicator",
    },

    // =========================================================================
    // Feedback Components
    // =========================================================================
    Banner: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        type: z.enum(["default", "caution", "critical"]).default("default"),
        dismissible: z.boolean().nullable(),
      }),
      description:
        "Alert banner for important messages with optional dismiss button",
    },

    // =========================================================================
    // List Components
    // =========================================================================
    List: {
      props: z.object({}),
      slots: ["default"],
      description:
        "Container for ListItem components with optional action handling",
    },

    ListItem: {
      props: z.object({
        title: z.string(),
        secondaryTitle: z.string().nullable(),
        value: z.string().nullable(),
        id: z.string().nullable(),
        size: z.enum(["default", "large"]).default("default"),
      }),
      description:
        "List item with title, optional secondary text and value display",
    },

    PropertyList: {
      props: z.object({
        orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
      }),
      slots: ["default"],
      description:
        "List of label-value pairs for displaying properties/details",
    },

    PropertyListItem: {
      props: z.object({
        label: z.string(),
        value: z.string(),
      }),
      description: "Single property item with label and value",
    },

    TaskList: {
      props: z.object({}),
      slots: ["default"],
      description: "Container for task items with status indicators",
    },

    TaskListItem: {
      props: z.object({
        title: z.string(),
        status: z
          .enum(["not-started", "in-progress", "blocked", "complete"])
          .default("not-started"),
        action: z.string().nullable(),
      }),
      description: "Task item with title and status indicator",
    },

    // =========================================================================
    // Menu Components
    // =========================================================================
    Menu: {
      props: z.object({
        triggerLabel: z.string(),
      }),
      slots: ["default"],
      description: "Dropdown menu container with trigger button",
    },

    MenuItem: {
      props: z.object({
        label: z.string(),
        id: z.string(),
        disabled: z.boolean().nullable(),
        action: z.string().nullable(),
      }),
      description: "Menu item with label and optional action",
    },

    MenuGroup: {
      props: z.object({
        title: z.string().nullable(),
      }),
      slots: ["default"],
      description: "Group of menu items with optional title",
    },

    // =========================================================================
    // Form Components
    // =========================================================================
    TextField: {
      props: z.object({
        label: z.string(),
        placeholder: z.string().nullable(),
        description: z.string().nullable(),
        error: z.string().nullable(),
        value: z.string().nullable(),
        type: z
          .enum(["text", "email", "password", "number", "tel", "url"])
          .default("text"),
        size: z.enum(["small", "medium", "large"]).default("medium"),
        disabled: z.boolean().nullable(),
        required: z.boolean().nullable(),
      }),
      description:
        "Text input field with label, validation. Use $bindState on value for two-way binding.",
      example: {
        label: "Email",
        placeholder: "customer@example.com",
        value: { $bindState: "/form/email" },
        type: "email",
      },
    },

    TextArea: {
      props: z.object({
        label: z.string(),
        placeholder: z.string().nullable(),
        description: z.string().nullable(),
        error: z.string().nullable(),
        value: z.string().nullable(),
        rows: z.number().default(3),
        disabled: z.boolean().nullable(),
        required: z.boolean().nullable(),
      }),
      description:
        "Multi-line text input with configurable rows. Use $bindState on value for two-way binding.",
    },

    Select: {
      props: z.object({
        label: z.string(),
        description: z.string().nullable(),
        error: z.string().nullable(),
        value: z.string().nullable(),
        options: z.array(z.object({ value: z.string(), label: z.string() })),
        size: z.enum(["small", "medium", "large"]).default("medium"),
        disabled: z.boolean().nullable(),
        required: z.boolean().nullable(),
      }),
      description:
        "Dropdown select input with configurable options. Use $bindState on value for two-way binding.",
    },

    Checkbox: {
      props: z.object({
        label: z.string(),
        description: z.string().nullable(),
        error: z.string().nullable(),
        checked: z.boolean().nullable(),
        defaultChecked: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
      }),
      description:
        "Checkbox input with label and description. Use $bindState on checked for two-way binding.",
    },

    Radio: {
      props: z.object({
        label: z.string(),
        description: z.string().nullable(),
        value: z.string().nullable(),
        optionValue: z.string(),
        name: z.string(),
        disabled: z.boolean().nullable(),
      }),
      description:
        "Radio button input for selecting one option from a group. Use $bindState on value for two-way binding.",
    },

    Switch: {
      props: z.object({
        label: z.string(),
        description: z.string().nullable(),
        checked: z.boolean().nullable(),
        defaultChecked: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
      }),
      description:
        "Toggle switch for boolean values. Use $bindState on checked for two-way binding.",
    },

    DateField: {
      props: z.object({
        label: z.string(),
        description: z.string().nullable(),
        error: z.string().nullable(),
        value: z.string().nullable(),
        size: z.enum(["small", "medium", "large"]).default("medium"),
        disabled: z.boolean().nullable(),
      }),
      description:
        "Date input field with date picker. Use $bindState on value for two-way binding.",
    },

    // =========================================================================
    // Button Components
    // =========================================================================
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string(),
        actionParams: z.record(z.string(), z.unknown()).nullable(),
        type: z
          .enum(["primary", "secondary", "destructive"])
          .default("primary"),
        size: z.enum(["small", "medium", "large"]).default("medium"),
        disabled: z.boolean().nullable(),
        pending: z.boolean().nullable(),
        href: z.string().nullable(),
      }),
      description:
        "Action button with configurable style, size, and action handling",
      example: {
        label: "View Details",
        action: "viewCustomer",
        type: "primary",
      },
    },

    ButtonGroup: {
      props: z.object({}),
      slots: ["default"],
      description: "Group of buttons displayed together",
    },

    Link: {
      props: z.object({
        label: z.string(),
        href: z.string(),
        type: z.enum(["primary", "secondary"]).default("primary"),
        external: z.boolean().nullable(),
      }),
      description: "Text link for navigation",
    },

    // =========================================================================
    // Chart Components
    // =========================================================================
    BarChart: {
      props: z.object({
        data: z.array(z.record(z.unknown())).nullable(),
        xKey: z.string(),
        yKey: z.string(),
        colorKey: z.string().nullable(),
        showAxis: z.enum(["x", "y", "both", "none"]).default("both"),
        showGrid: z.enum(["x", "y", "both", "none"]).default("none"),
        showLegend: z.boolean().nullable(),
        showTooltip: z.boolean().default(true),
      }),
      description:
        "Bar chart visualization. Use $state on data to bind to state array.",
    },

    LineChart: {
      props: z.object({
        data: z.array(z.record(z.unknown())).nullable(),
        xKey: z.string(),
        yKey: z.string(),
        colorKey: z.string().nullable(),
        showAxis: z.enum(["x", "y", "both", "none"]).default("both"),
        showGrid: z.enum(["x", "y", "both", "none"]).default("none"),
        showLegend: z.boolean().nullable(),
        showTooltip: z.boolean().default(true),
      }),
      description:
        "Line chart visualization. Use $state on data to bind to state array.",
    },

    Sparkline: {
      props: z.object({
        data: z.array(z.record(z.unknown())).nullable(),
        xKey: z.string(),
        yKey: z.string(),
        showTooltip: z.boolean().nullable(),
      }),
      description:
        "Compact sparkline chart for inline data visualization. Use $state on data to bind to state array.",
    },

    // =========================================================================
    // Table Components
    // =========================================================================
    DataTable: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.unknown())).nullable(),
        columns: z.array(z.object({ key: z.string(), label: z.string() })),
        emptyMessage: z.string().nullable(),
        rowAction: z.string().nullable(),
      }),
      description:
        "Data table with configurable columns and optional row actions. Use $state on data to bind to state array.",
      example: {
        title: "Recent Payments",
        data: { $state: "/payments/data" },
        columns: [
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
        ],
      },
    },

    // =========================================================================
    // Stripe-Specific Card Components
    // =========================================================================
    CustomerCard: {
      props: z.object({
        name: z.string(),
        email: z.string(),
        status: z.enum(["active", "inactive"]).default("active"),
        customerId: z.string().nullable(),
      }),
      description:
        "Card displaying customer information with name, email, and status",
      example: {
        name: "Jane Smith",
        email: "jane@example.com",
        status: "active",
      },
    },

    PaymentCard: {
      props: z.object({
        amount: z.number(),
        currency: z.string().default("usd"),
        status: z
          .enum([
            "succeeded",
            "pending",
            "failed",
            "canceled",
            "requires_action",
          ])
          .default("succeeded"),
        description: z.string().nullable(),
        paymentId: z.string().nullable(),
      }),
      description: "Card displaying payment information with amount and status",
    },

    SubscriptionCard: {
      props: z.object({
        planName: z.string(),
        status: z
          .enum([
            "active",
            "trialing",
            "past_due",
            "canceled",
            "unpaid",
            "incomplete",
          ])
          .default("active"),
        amount: z.number(),
        currency: z.string().default("usd"),
        interval: z.enum(["day", "week", "month", "year"]).default("month"),
        currentPeriodEnd: z.string().nullable(),
      }),
      description:
        "Card displaying subscription details with plan, status, and billing info",
    },

    InvoiceCard: {
      props: z.object({
        invoiceNumber: z.string(),
        amount: z.number(),
        currency: z.string().default("usd"),
        status: z
          .enum(["draft", "open", "paid", "void", "uncollectible"])
          .default("open"),
        dueDate: z.string().nullable(),
        customerEmail: z.string().nullable(),
      }),
      description:
        "Card displaying invoice details with number, amount, and status",
    },

    RefundCard: {
      props: z.object({
        amount: z.number(),
        currency: z.string().default("usd"),
        status: z
          .enum(["pending", "succeeded", "failed", "canceled"])
          .default("succeeded"),
        reason: z.string().nullable(),
      }),
      description: "Card displaying refund information",
    },

    DisputeCard: {
      props: z.object({
        amount: z.number(),
        currency: z.string().default("usd"),
        status: z
          .enum([
            "warning_needs_response",
            "warning_under_review",
            "warning_closed",
            "needs_response",
            "under_review",
            "won",
            "lost",
          ])
          .default("needs_response"),
        reason: z.string().nullable(),
        dueDate: z.string().nullable(),
      }),
      description:
        "Card displaying dispute information with status and deadline",
    },

    BalanceCard: {
      props: z.object({
        available: z.number(),
        pending: z.number(),
        currency: z.string().default("usd"),
      }),
      description: "Card showing account balance breakdown",
    },

    // =========================================================================
    // Chip Components
    // =========================================================================
    Chip: {
      props: z.object({
        label: z.string(),
        value: z.string().nullable(),
        removable: z.boolean().nullable(),
        action: z.string().nullable(),
      }),
      description: "Chip/tag component for filters or selections",
    },

    ChipList: {
      props: z.object({}),
      slots: ["default"],
      description: "Container for multiple chips",
    },

    // =========================================================================
    // Tooltip Component
    // =========================================================================
    Tooltip: {
      props: z.object({
        content: z.string(),
        placement: z.enum(["top", "bottom", "left", "right"]).default("top"),
      }),
      slots: ["default"],
      description: "Tooltip that appears on hover over child element",
    },
  },

  actions: {
    // =========================================================================
    // Customer Actions
    // =========================================================================
    fetchCustomers: {
      params: z.object({
        limit: z.number().nullable(),
        email: z.string().nullable(),
        startingAfter: z.string().nullable(),
      }),
      description:
        "Fetch customers list with pagination. Data at '/customers/data'",
    },
    viewCustomer: {
      params: z.object({ customerId: z.string() }),
      description: "Open customer details in Stripe Dashboard",
    },
    createCustomer: {
      params: z.object({
        email: z.string(),
        name: z.string().nullable(),
        phone: z.string().nullable(),
        description: z.string().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Create a new customer with optional metadata",
    },
    updateCustomer: {
      params: z.object({
        customerId: z.string(),
        email: z.string().nullable(),
        name: z.string().nullable(),
        phone: z.string().nullable(),
        description: z.string().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Update an existing customer",
    },
    deleteCustomer: {
      params: z.object({ customerId: z.string() }),
      description: "Delete a customer permanently",
    },
    searchCustomers: {
      params: z.object({ query: z.string(), limit: z.number().nullable() }),
      description: "Search customers by email, name, or metadata",
    },

    // =========================================================================
    // Payment Intent Actions
    // =========================================================================
    fetchPayments: {
      params: z.object({
        limit: z.number().nullable(),
        customerId: z.string().nullable(),
        status: z.string().nullable(),
        startingAfter: z.string().nullable(),
      }),
      description: "Fetch payment intents list. Data at '/payments/data'",
    },
    viewPayment: {
      params: z.object({ paymentId: z.string() }),
      description: "Open payment details in Stripe Dashboard",
    },
    createPaymentIntent: {
      params: z.object({
        amount: z.number(),
        currency: z.string(),
        customerId: z.string().nullable(),
        description: z.string().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Create a new payment intent",
    },
    capturePayment: {
      params: z.object({
        paymentId: z.string(),
        amountToCapture: z.number().nullable(),
      }),
      description: "Capture an authorized payment",
    },
    cancelPayment: {
      params: z.object({
        paymentId: z.string(),
        reason: z
          .enum([
            "duplicate",
            "fraudulent",
            "requested_by_customer",
            "abandoned",
          ])
          .nullable(),
      }),
      description: "Cancel a payment intent",
    },

    // =========================================================================
    // Refund Actions
    // =========================================================================
    fetchRefunds: {
      params: z.object({
        limit: z.number().nullable(),
        paymentIntentId: z.string().nullable(),
        chargeId: z.string().nullable(),
      }),
      description: "Fetch refunds list. Data at '/refunds/data'",
    },
    refundPayment: {
      params: z.object({
        paymentId: z.string(),
        amount: z.number().nullable(),
        reason: z
          .enum(["duplicate", "fraudulent", "requested_by_customer"])
          .nullable(),
      }),
      description: "Create a refund for a payment",
    },
    updateRefund: {
      params: z.object({
        refundId: z.string(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Update refund metadata",
    },

    // =========================================================================
    // Charge Actions
    // =========================================================================
    fetchCharges: {
      params: z.object({
        limit: z.number().nullable(),
        customerId: z.string().nullable(),
        paymentIntentId: z.string().nullable(),
      }),
      description: "Fetch charges list. Data at '/charges/data'",
    },
    captureCharge: {
      params: z.object({ chargeId: z.string(), amount: z.number().nullable() }),
      description: "Capture a previously authorized charge",
    },

    // =========================================================================
    // Subscription Actions
    // =========================================================================
    fetchSubscriptions: {
      params: z.object({
        limit: z.number().nullable(),
        status: z
          .enum([
            "active",
            "past_due",
            "unpaid",
            "canceled",
            "incomplete",
            "incomplete_expired",
            "trialing",
            "paused",
          ])
          .nullable(),
        customerId: z.string().nullable(),
        priceId: z.string().nullable(),
      }),
      description: "Fetch subscriptions. Data at '/subscriptions/data'",
    },
    viewSubscription: {
      params: z.object({ subscriptionId: z.string() }),
      description: "Open subscription details in Stripe Dashboard",
    },
    createSubscription: {
      params: z.object({
        customerId: z.string(),
        priceId: z.string(),
        quantity: z.number().nullable(),
        trialPeriodDays: z.number().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Create a new subscription for a customer",
    },
    updateSubscription: {
      params: z.object({
        subscriptionId: z.string(),
        priceId: z.string().nullable(),
        quantity: z.number().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Update a subscription (change price, quantity)",
    },
    cancelSubscription: {
      params: z.object({
        subscriptionId: z.string(),
        immediately: z.boolean().nullable(),
        cancelAtPeriodEnd: z.boolean().nullable(),
      }),
      description: "Cancel a subscription immediately or at period end",
    },
    pauseSubscription: {
      params: z.object({
        subscriptionId: z.string(),
        resumeAt: z.number().nullable(),
      }),
      description: "Pause a subscription's payment collection",
    },
    resumeSubscription: {
      params: z.object({ subscriptionId: z.string() }),
      description: "Resume a paused subscription",
    },

    // =========================================================================
    // Invoice Actions
    // =========================================================================
    fetchInvoices: {
      params: z.object({
        limit: z.number().nullable(),
        status: z
          .enum(["draft", "open", "paid", "uncollectible", "void"])
          .nullable(),
        customerId: z.string().nullable(),
        subscriptionId: z.string().nullable(),
      }),
      description: "Fetch invoices. Data at '/invoices/data'",
    },
    viewInvoice: {
      params: z.object({ invoiceId: z.string() }),
      description: "Open invoice in Stripe Dashboard",
    },
    createInvoice: {
      params: z.object({
        customerId: z.string(),
        description: z.string().nullable(),
        daysUntilDue: z.number().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Create a draft invoice for a customer",
    },
    addInvoiceItem: {
      params: z.object({
        invoiceId: z.string(),
        amount: z.number(),
        currency: z.string(),
        description: z.string().nullable(),
      }),
      description: "Add a line item to an invoice",
    },
    finalizeInvoice: {
      params: z.object({
        invoiceId: z.string(),
        autoAdvance: z.boolean().nullable(),
      }),
      description: "Finalize a draft invoice",
    },
    sendInvoice: {
      params: z.object({ invoiceId: z.string() }),
      description: "Send invoice to customer via email",
    },
    payInvoice: {
      params: z.object({
        invoiceId: z.string(),
        paymentMethodId: z.string().nullable(),
      }),
      description: "Pay an open invoice",
    },
    voidInvoice: {
      params: z.object({ invoiceId: z.string() }),
      description: "Void an invoice (cannot be undone)",
    },
    markInvoiceUncollectible: {
      params: z.object({ invoiceId: z.string() }),
      description: "Mark invoice as uncollectible",
    },
    downloadInvoicePdf: {
      params: z.object({ invoiceId: z.string() }),
      description: "Download invoice as PDF",
    },

    // =========================================================================
    // Product & Price Actions
    // =========================================================================
    fetchProducts: {
      params: z.object({
        limit: z.number().nullable(),
        active: z.boolean().nullable(),
      }),
      description: "Fetch products list. Data at '/products/data'",
    },
    viewProduct: {
      params: z.object({ productId: z.string() }),
      description: "Open product in Stripe Dashboard",
    },
    createProduct: {
      params: z.object({
        name: z.string(),
        description: z.string().nullable(),
        active: z.boolean().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Create a new product",
    },
    updateProduct: {
      params: z.object({
        productId: z.string(),
        name: z.string().nullable(),
        description: z.string().nullable(),
        active: z.boolean().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Update a product",
    },
    archiveProduct: {
      params: z.object({ productId: z.string() }),
      description: "Archive a product (set active=false)",
    },
    fetchPrices: {
      params: z.object({
        limit: z.number().nullable(),
        productId: z.string().nullable(),
        active: z.boolean().nullable(),
        type: z.enum(["one_time", "recurring"]).nullable(),
      }),
      description: "Fetch prices list. Data at '/prices/data'",
    },
    createPrice: {
      params: z.object({
        productId: z.string(),
        unitAmount: z.number(),
        currency: z.string(),
        recurring: z
          .object({
            interval: z.enum(["day", "week", "month", "year"]),
            intervalCount: z.number().nullable(),
          })
          .nullable(),
        nickname: z.string().nullable(),
      }),
      description: "Create a new price for a product",
    },
    updatePrice: {
      params: z.object({
        priceId: z.string(),
        active: z.boolean().nullable(),
        nickname: z.string().nullable(),
        metadata: z.record(z.string(), z.string()).nullable(),
      }),
      description: "Update a price",
    },

    // =========================================================================
    // Balance & Payout Actions
    // =========================================================================
    fetchBalance: {
      params: z.object({}),
      description: "Fetch current account balance. Data at '/balance'",
    },
    fetchPayouts: {
      params: z.object({
        limit: z.number().nullable(),
        status: z.enum(["pending", "paid", "failed", "canceled"]).nullable(),
      }),
      description: "Fetch payouts list. Data at '/payouts/data'",
    },
    createPayout: {
      params: z.object({
        amount: z.number(),
        currency: z.string(),
        description: z.string().nullable(),
      }),
      description: "Create a payout to your bank account",
    },
    cancelPayout: {
      params: z.object({ payoutId: z.string() }),
      description: "Cancel a pending payout",
    },

    // =========================================================================
    // Dispute Actions
    // =========================================================================
    fetchDisputes: {
      params: z.object({
        limit: z.number().nullable(),
        status: z
          .enum([
            "warning_needs_response",
            "warning_under_review",
            "warning_closed",
            "needs_response",
            "under_review",
            "won",
            "lost",
          ])
          .nullable(),
        chargeId: z.string().nullable(),
      }),
      description: "Fetch disputes list. Data at '/disputes/data'",
    },
    viewDispute: {
      params: z.object({ disputeId: z.string() }),
      description: "Open dispute in Stripe Dashboard",
    },
    updateDispute: {
      params: z.object({
        disputeId: z.string(),
        evidence: z
          .object({
            customerName: z.string().nullable(),
            customerEmailAddress: z.string().nullable(),
            productDescription: z.string().nullable(),
            uncategorizedText: z.string().nullable(),
          })
          .nullable(),
        submit: z.boolean().nullable(),
      }),
      description: "Update dispute evidence",
    },
    closeDispute: {
      params: z.object({ disputeId: z.string() }),
      description: "Close a dispute and accept it",
    },

    // =========================================================================
    // Payment Method Actions
    // =========================================================================
    fetchPaymentMethods: {
      params: z.object({
        customerId: z.string(),
        type: z
          .enum(["card", "bank_account", "us_bank_account", "sepa_debit"])
          .nullable(),
      }),
      description:
        "Fetch customer payment methods. Data at '/paymentMethods/data'",
    },
    attachPaymentMethod: {
      params: z.object({ paymentMethodId: z.string(), customerId: z.string() }),
      description: "Attach a payment method to a customer",
    },
    detachPaymentMethod: {
      params: z.object({ paymentMethodId: z.string() }),
      description: "Detach a payment method from its customer",
    },
    setDefaultPaymentMethod: {
      params: z.object({ customerId: z.string(), paymentMethodId: z.string() }),
      description: "Set the default payment method for a customer",
    },

    // =========================================================================
    // Coupon & Promotion Actions
    // =========================================================================
    fetchCoupons: {
      params: z.object({ limit: z.number().nullable() }),
      description: "Fetch coupons list. Data at '/coupons/data'",
    },
    createCoupon: {
      params: z.object({
        percentOff: z.number().nullable(),
        amountOff: z.number().nullable(),
        currency: z.string().nullable(),
        duration: z.enum(["forever", "once", "repeating"]),
        durationInMonths: z.number().nullable(),
        name: z.string().nullable(),
        maxRedemptions: z.number().nullable(),
      }),
      description: "Create a new coupon",
    },
    deleteCoupon: {
      params: z.object({ couponId: z.string() }),
      description: "Delete a coupon",
    },
    fetchPromotionCodes: {
      params: z.object({
        limit: z.number().nullable(),
        couponId: z.string().nullable(),
        active: z.boolean().nullable(),
      }),
      description: "Fetch promotion codes. Data at '/promotionCodes/data'",
    },
    createPromotionCode: {
      params: z.object({
        couponId: z.string(),
        code: z.string().nullable(),
        maxRedemptions: z.number().nullable(),
        expiresAt: z.number().nullable(),
      }),
      description: "Create a promotion code for a coupon",
    },

    // =========================================================================
    // Checkout Session Actions
    // =========================================================================
    createCheckoutSession: {
      params: z.object({
        mode: z.enum(["payment", "subscription", "setup"]),
        lineItems: z.array(
          z.object({ priceId: z.string(), quantity: z.number() }),
        ),
        successUrl: z.string(),
        cancelUrl: z.string(),
        customerId: z.string().nullable(),
      }),
      description: "Create a Checkout Session and get the URL",
    },
    fetchCheckoutSessions: {
      params: z.object({
        limit: z.number().nullable(),
        customerId: z.string().nullable(),
        paymentIntentId: z.string().nullable(),
      }),
      description: "Fetch checkout sessions. Data at '/checkoutSessions/data'",
    },
    expireCheckoutSession: {
      params: z.object({ sessionId: z.string() }),
      description: "Expire an open checkout session",
    },

    // =========================================================================
    // Billing Portal Actions
    // =========================================================================
    createBillingPortalSession: {
      params: z.object({ customerId: z.string(), returnUrl: z.string() }),
      description: "Create a billing portal session for customer self-service",
    },

    // =========================================================================
    // Webhook & Event Actions
    // =========================================================================
    fetchEvents: {
      params: z.object({
        limit: z.number().nullable(),
        type: z.string().nullable(),
        createdGte: z.number().nullable(),
        createdLte: z.number().nullable(),
      }),
      description: "Fetch recent events/webhooks. Data at '/events/data'",
    },

    // =========================================================================
    // Setup Intent Actions
    // =========================================================================
    createSetupIntent: {
      params: z.object({
        customerId: z.string().nullable(),
        paymentMethodTypes: z.array(z.string()).nullable(),
        usage: z.enum(["on_session", "off_session"]).nullable(),
      }),
      description: "Create a SetupIntent for saving payment methods",
    },
    fetchSetupIntents: {
      params: z.object({
        limit: z.number().nullable(),
        customerId: z.string().nullable(),
      }),
      description: "Fetch setup intents. Data at '/setupIntents/data'",
    },
    cancelSetupIntent: {
      params: z.object({ setupIntentId: z.string() }),
      description: "Cancel a setup intent",
    },

    // =========================================================================
    // Tax Rate Actions
    // =========================================================================
    fetchTaxRates: {
      params: z.object({
        limit: z.number().nullable(),
        active: z.boolean().nullable(),
        inclusive: z.boolean().nullable(),
      }),
      description: "Fetch tax rates. Data at '/taxRates/data'",
    },
    createTaxRate: {
      params: z.object({
        displayName: z.string(),
        percentage: z.number(),
        inclusive: z.boolean(),
        jurisdiction: z.string().nullable(),
        description: z.string().nullable(),
      }),
      description: "Create a new tax rate",
    },

    // =========================================================================
    // Data & Refresh Actions
    // =========================================================================
    refreshData: {
      params: z.object({}),
      description: "Refresh all dashboard data",
    },
    refreshCustomers: {
      params: z.object({}),
      description: "Refresh customers data only",
    },
    refreshPayments: {
      params: z.object({}),
      description: "Refresh payments data only",
    },
    refreshSubscriptions: {
      params: z.object({}),
      description: "Refresh subscriptions data only",
    },
    refreshInvoices: {
      params: z.object({}),
      description: "Refresh invoices data only",
    },
    exportData: {
      params: z.object({
        format: z.enum(["csv", "json"]),
        dataType: z.enum([
          "customers",
          "payments",
          "subscriptions",
          "invoices",
        ]),
      }),
      description: "Export data as CSV or JSON",
    },

    // =========================================================================
    // Navigation Actions
    // =========================================================================
    navigate: {
      params: z.object({ path: z.string() }),
      description: "Navigate to a Dashboard page",
    },
    openDashboard: {
      params: z.object({
        page: z
          .enum([
            "home",
            "payments",
            "customers",
            "products",
            "subscriptions",
            "invoices",
            "connect",
            "reports",
            "developers",
          ])
          .nullable(),
      }),
      description: "Open Stripe Dashboard page in new tab",
    },
    openExternalLink: {
      params: z.object({ url: z.string() }),
      description: "Open an external URL in new tab",
    },

    // =========================================================================
    // Form Actions
    // =========================================================================
    submitForm: {
      params: z.object({ formId: z.string().nullable() }),
      description: "Submit form data",
    },
    resetForm: {
      params: z.object({ formId: z.string().nullable() }),
      description: "Reset form to initial values",
    },
    validateForm: {
      params: z.object({ formId: z.string().nullable() }),
      description: "Validate form without submitting",
    },
    setFormValue: {
      params: z.object({ path: z.string(), value: z.unknown() }),
      description: "Set a specific form field value",
    },

    // =========================================================================
    // UI Actions
    // =========================================================================
    showToast: {
      params: z.object({
        message: z.string(),
        type: z.enum(["success", "error", "warning", "info"]).nullable(),
      }),
      description: "Show a toast notification",
    },
    copyToClipboard: {
      params: z.object({ text: z.string() }),
      description: "Copy text to clipboard",
    },
    setLoading: {
      params: z.object({
        loading: z.boolean(),
        message: z.string().nullable(),
      }),
      description: "Show/hide loading state",
    },

    // =========================================================================
    // Filter & Sort Actions
    // =========================================================================
    setFilter: {
      params: z.object({ key: z.string(), value: z.unknown() }),
      description: "Set a filter value",
    },
    clearFilters: {
      params: z.object({}),
      description: "Clear all filters",
    },
    setSort: {
      params: z.object({
        field: z.string(),
        direction: z.enum(["asc", "desc"]),
      }),
      description: "Set sort field and direction",
    },
    setPageSize: {
      params: z.object({ size: z.number() }),
      description: "Set items per page",
    },
    goToPage: {
      params: z.object({ page: z.number() }),
      description: "Navigate to a specific page",
    },
  },
});

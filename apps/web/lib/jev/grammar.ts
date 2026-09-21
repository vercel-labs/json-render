import type {
  Experimental_CompositionCandidate,
  UIElement,
} from "@json-render/core";

export const MAX_ELEMENTS = 14;
export type Candidate = Experimental_CompositionCandidate;

const fieldValues = {
  name: "",
  email: "",
  password: "",
  message: "",
  topic: "General",
  notifications: false,
  remember: false,
};
export const platformState = {
  form: fieldValues,
  status: "No changes saved yet.",
  profile: {
    name: "Maya Chen",
    role: "Product designer",
    bio: "Designing thoughtful tools that make everyday work simpler.",
    email: "maya@example.com",
    location: "Portland, OR",
    membership: "Pro member",
  },
};

/** Prop values are platform content, never model-invented strings or code. */
export function buildCandidates(prompt: string): Candidate[] {
  const candidates: Candidate[] = [];
  function add(
    id: string,
    description: string,
    type: string,
    props: Record<string, unknown>,
    resource?: string,
    on?: UIElement["on"],
  ) {
    candidates.push({
      id,
      description,
      resource,
      root: ["card", "stack_vertical", "grid_two", "grid_three"].includes(id),
      maxUses: ["Card", "Stack", "Grid", "Separator"].includes(type)
        ? MAX_ELEMENTS
        : 1,
      element: { type, props, ...(on ? { on } : {}) },
    });
  }
  add(
    "card",
    "Card: a bordered container for a compact form or related content.",
    "Card",
    { title: null, description: null, maxWidth: "md", centered: true },
  );
  add(
    "stack_vertical",
    "Stack: vertical layout for a page or section.",
    "Stack",
    { direction: "vertical", gap: "md", align: "stretch", justify: "start" },
  );
  add(
    "stack_horizontal",
    "Stack: horizontal row for two or more explicitly requested side-by-side elements, such as Save and Reset buttons. Not needed for a single button or an ordinary vertical form.",
    "Stack",
    { direction: "horizontal", gap: "sm", align: "center", justify: "start" },
  );
  add("grid_two", "Grid: two equal columns for side-by-side content.", "Grid", {
    columns: 2,
    gap: "md",
  });
  add(
    "grid_three",
    "Grid: three equal columns, e.g. a row of metrics.",
    "Grid",
    { columns: 3, gap: "md" },
  );

  const titles = [
    "Sign in",
    "Contact us",
    "Account settings",
    "Sales overview",
    "Customer overview",
    "Create account",
    "Support request",
  ];
  // Quoted labels are copied from the request; Jev can select them without generating text.
  const quoted = [...prompt.matchAll(/["“]([^"”\n]{1,80})["”]/g)].map(
    (match) => match[1]!,
  );
  for (const [index, text] of [...new Set([...titles, ...quoted])]
    .slice(0, 12)
    .entries()) {
    add(
      `heading_${index}`,
      `Heading with the exact text ${JSON.stringify(text)}. Include only when this is the requested title or heading; quoted field values and biography text are not headings.`,
      "Heading",
      { text, level: "h2" },
      `text:${text}`,
    );
  }
  for (const size of ["lg", "md", "sm"] as const) {
    add(
      `profile_avatar_${size}`,
      `Avatar: ${size === "lg" ? "large" : size === "md" ? "medium" : "small"} profile avatar with initials from the user's name. Use large for a profile card unless another size is requested.`,
      "Avatar",
      { src: null, name: { $state: "/profile/name" }, size },
      "data:profile_avatar",
    );
  }
  add(
    "profile_name",
    "Heading: display the user's profile name as read-only text.",
    "Heading",
    { text: { $state: "/profile/name" }, level: "h2" },
    "data:profile_name",
  );
  for (const [field, description, variant] of [
    ["role", "job title or role", "lead"],
    ["bio", "short biography or about text", "body"],
    ["email", "email address", "muted"],
    ["location", "location", "muted"],
  ] as const) {
    add(
      `profile_${field}`,
      `Text: display the user's profile ${description} as read-only text.`,
      "Text",
      { text: { $state: `/profile/${field}` }, variant },
      `data:profile_${field}`,
    );
  }
  add(
    "profile_membership",
    "Badge: display the user's profile membership status.",
    "Badge",
    { text: { $state: "/profile/membership" }, variant: "default" },
    "data:profile_membership",
  );
  for (const [name, label, type] of [
    ["name", "Full name", "text"],
    ["email", "Email", "email"],
    ["password", "Password", "password"],
  ] as const) {
    add(
      `input_${name}`,
      `Input: editable ${label.toLowerCase()} field. ${name === "password" ? "For sign-in or account creation." : ""}`,
      "Input",
      {
        name,
        label,
        type,
        placeholder: null,
        value: { $bindState: `/form/${name}` },
        checks: [
          { type: "required", message: `${label} is required.` },
          ...(type === "email"
            ? [{ type: "email", message: "Enter a valid email address." }]
            : []),
        ],
      },
      `field:${name}`,
    );
  }
  add(
    "message",
    "Textarea: editable multi-line message or support inquiry.",
    "Textarea",
    {
      name: "message",
      label: "Message",
      placeholder: null,
      rows: 4,
      value: { $bindState: "/form/message" },
      checks: [{ type: "required", message: "Enter a message." }],
    },
    "field:message",
  );
  add(
    "topic",
    "Select: choose a contact topic from General, Billing, Technical.",
    "Select",
    {
      name: "topic",
      label: "Topic",
      options: ["General", "Billing", "Technical"],
      placeholder: null,
      value: { $bindState: "/form/topic" },
      checks: null,
    },
    "field:topic",
  );
  add(
    "remember",
    "Checkbox: remember me when signing in.",
    "Checkbox",
    {
      name: "remember",
      label: "Remember me",
      checked: { $bindState: "/form/remember" },
    },
    "field:remember",
  );
  add(
    "notifications_switch",
    "Switch: enable email notifications in account settings.",
    "Switch",
    {
      name: "notifications",
      label: "Email notifications",
      checked: { $bindState: "/form/notifications" },
    },
    "field:notifications",
  );
  add(
    "notifications_checkbox",
    "Checkbox: enable email notifications, if a checkbox is requested.",
    "Checkbox",
    {
      name: "notifications",
      label: "Email notifications",
      checked: { $bindState: "/form/notifications" },
    },
    "field:notifications",
  );

  const submitLabels = ["Sign in", "Create account", "Send message", "Submit"];
  for (const [index, label] of submitLabels.entries()) {
    add(
      `submit_${index}`,
      `Button labeled ${JSON.stringify(label)}. Bind press to the catalog's formSubmit action, which validates inputs and shows a demo toast.`,
      "Button",
      { label, variant: "primary", disabled: false },
      "action:submit",
      { press: { action: "formSubmit", params: { formName: "jev-form" } } },
    );
  }
  add(
    "save",
    "Button: Save changes. Bind press to setState to update the visible saved-status text. Local demo only.",
    "Button",
    { label: "Save changes", variant: "primary", disabled: false },
    "action:save",
    {
      press: {
        action: "setState",
        params: { statePath: "/status", value: "Changes saved locally." },
      },
    },
  );
  add(
    "reset",
    "Button: Reset. Bind press to setState to restore all form fields to their initial values.",
    "Button",
    { label: "Reset", variant: "outline", disabled: false },
    "action:reset",
    {
      press: {
        action: "setState",
        params: { statePath: "/form", value: structuredClone(fieldValues) },
      },
    },
  );
  add(
    "status",
    "Text: live save status, bound to /status. Include alongside Save changes.",
    "Text",
    { text: { $state: "/status" }, variant: "muted" },
    "data:status",
  );
  add(
    "revenue",
    "Metric: total sales revenue, $48,250, up 12.8%. Synthetic platform data.",
    "Metric",
    {
      label: "Revenue",
      value: "48,250",
      prefix: "$",
      suffix: null,
      change: "+12.8%",
      changeType: "positive",
    },
    "data:revenue",
  );
  add(
    "orders",
    "Metric: 384 orders, up 8.2%. Synthetic platform data.",
    "Metric",
    {
      label: "Orders",
      value: "384",
      prefix: null,
      suffix: null,
      change: "+8.2%",
      changeType: "positive",
    },
    "data:orders",
  );
  add(
    "customers",
    "Metric: 125 new customers, up 14.4%. Synthetic platform data.",
    "Metric",
    {
      label: "New customers",
      value: "125",
      prefix: null,
      suffix: null,
      change: "+14.4%",
      changeType: "positive",
    },
    "data:customers",
  );
  add(
    "sales_chart",
    "BarGraph: weekly revenue chart (Week 1–4). Synthetic platform data.",
    "BarGraph",
    {
      title: "Weekly revenue",
      data: [
        { label: "Week 1", value: 9200 },
        { label: "Week 2", value: 11400 },
        { label: "Week 3", value: 12650 },
        { label: "Week 4", value: 15000 },
      ],
    },
    "data:sales_chart",
  );
  add(
    "orders_table",
    "Table: order-status breakdown with Fulfilled, Processing, and Returned counts. Synthetic platform data.",
    "Table",
    {
      columns: ["Status", "Orders"],
      rows: [
        ["Fulfilled", "312"],
        ["Processing", "54"],
        ["Returned", "18"],
      ],
      caption: "Synthetic order data",
    },
    "data:orders_table",
  );
  add(
    "separator",
    "Separator: horizontal dividing line, only when requested.",
    "Separator",
    { orientation: "horizontal" },
  );
  return candidates;
}

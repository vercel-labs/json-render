import type { Spec } from "@json-render/core";

export interface Example {
  name: string;
  description: string;
  spec: Spec;
}

export const examples: Example[] = [
  {
    name: "Confetti",
    description: "A button that fires confetti when clicked",
    spec: {
      root: "btn",
      elements: {
        btn: {
          type: "Button",
          props: { label: "Click me", variant: "primary" },
          on: { press: { action: "confetti" } },
        },
      },
    },
  },

  {
    name: "User Profile Card",
    description: "A card with user info, badges, and a progress bar",
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: {
            title: "User Profile",
            description: null,
            maxWidth: "md",
            centered: null,
          },
          children: ["stack"],
        },
        stack: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "md",
            align: null,
            justify: null,
          },
          children: ["heading", "text", "badges", "sep", "progress"],
        },
        heading: {
          type: "Heading",
          props: { text: "Jane Cooper", level: "h2" },
        },
        text: {
          type: "Text",
          props: {
            text: "Senior software engineer based in San Francisco. Passionate about building accessible, high-performance web applications.",
            variant: "muted",
          },
        },
        badges: {
          type: "Stack",
          props: {
            direction: "horizontal",
            gap: "sm",
            align: null,
            justify: null,
          },
          children: ["b1", "b2", "b3"],
        },
        b1: {
          type: "Badge",
          props: { text: "TypeScript", variant: "default" },
        },
        b2: { type: "Badge", props: { text: "React", variant: "secondary" } },
        b3: { type: "Badge", props: { text: "Node.js", variant: "outline" } },
        sep: { type: "Separator", props: { orientation: null } },
        progress: {
          type: "Progress",
          props: { value: 72, max: 100, label: "Profile completion" },
        },
      },
    },
  },

  {
    name: "Settings Form",
    description: "A form with inputs, selects, switches, and checkboxes",
    spec: {
      root: "card",
      state: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "Engineer",
        notifications: true,
        darkMode: false,
      },
      elements: {
        card: {
          type: "Card",
          props: {
            title: "Account Settings",
            description: "Manage your preferences",
            maxWidth: "md",
            centered: null,
          },
          children: ["form"],
        },
        form: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "md",
            align: null,
            justify: null,
          },
          children: [
            "nameInput",
            "emailInput",
            "roleSelect",
            "sep",
            "notifSwitch",
            "darkSwitch",
            "sep2",
            "actions",
          ],
        },
        nameInput: {
          type: "Input",
          props: {
            label: "Full Name",
            name: "name",
            type: "text",
            placeholder: "Your name",
            value: { $bindState: "/name" },
            checks: null,
          },
        },
        emailInput: {
          type: "Input",
          props: {
            label: "Email",
            name: "email",
            type: "email",
            placeholder: "you@example.com",
            value: { $bindState: "/email" },
            checks: null,
          },
        },
        roleSelect: {
          type: "Select",
          props: {
            label: "Role",
            name: "role",
            options: [
              "Engineer",
              "Designer",
              "Product Manager",
              "Data Scientist",
            ],
            placeholder: "Choose a role",
            value: { $bindState: "/role" },
            checks: null,
          },
        },
        sep: { type: "Separator", props: { orientation: null } },
        notifSwitch: {
          type: "Switch",
          props: {
            label: "Email notifications",
            name: "notifications",
            checked: { $bindState: "/notifications" },
          },
        },
        darkSwitch: {
          type: "Switch",
          props: {
            label: "Dark mode",
            name: "darkMode",
            checked: { $bindState: "/darkMode" },
          },
        },
        sep2: { type: "Separator", props: { orientation: null } },
        actions: {
          type: "Stack",
          props: {
            direction: "horizontal",
            gap: "sm",
            align: null,
            justify: "end",
          },
          children: ["cancelBtn", "saveBtn"],
        },
        cancelBtn: {
          type: "Button",
          props: { label: "Cancel", variant: "secondary", disabled: null },
        },
        saveBtn: {
          type: "Button",
          props: { label: "Save Changes", variant: "primary", disabled: null },
        },
      },
    },
  },

  {
    name: "Pricing Table",
    description: "A grid of pricing cards with feature lists",
    spec: {
      root: "outer",
      elements: {
        outer: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: null,
            justify: null,
          },
          children: ["header", "grid"],
        },
        header: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "sm",
            align: "center",
            justify: null,
          },
          children: ["title", "subtitle"],
        },
        title: {
          type: "Heading",
          props: { text: "Simple, transparent pricing", level: "h1" },
        },
        subtitle: {
          type: "Text",
          props: {
            text: "Choose the plan that fits your needs. Upgrade or downgrade at any time.",
            variant: "muted",
          },
        },
        grid: {
          type: "Grid",
          props: { columns: 3, gap: "md" },
          children: ["free", "pro", "enterprise"],
        },
        free: {
          type: "Card",
          props: {
            title: "Free",
            description: "$0/month",
            maxWidth: null,
            centered: null,
          },
          children: ["freeContent"],
        },
        freeContent: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "sm",
            align: null,
            justify: null,
          },
          children: ["f1", "f2", "f3", "freeBtn"],
        },
        f1: {
          type: "Text",
          props: { text: "Up to 3 projects", variant: "body" },
        },
        f2: { type: "Text", props: { text: "1 GB storage", variant: "body" } },
        f3: {
          type: "Text",
          props: { text: "Community support", variant: "body" },
        },
        freeBtn: {
          type: "Button",
          props: { label: "Get Started", variant: "secondary", disabled: null },
        },
        pro: {
          type: "Card",
          props: {
            title: "Pro",
            description: "$19/month",
            maxWidth: null,
            centered: null,
          },
          children: ["proContent"],
        },
        proContent: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "sm",
            align: null,
            justify: null,
          },
          children: ["p1", "p2", "p3", "p4", "proBtn"],
        },
        p1: {
          type: "Text",
          props: { text: "Unlimited projects", variant: "body" },
        },
        p2: { type: "Text", props: { text: "50 GB storage", variant: "body" } },
        p3: {
          type: "Text",
          props: { text: "Priority support", variant: "body" },
        },
        p4: {
          type: "Text",
          props: { text: "Custom domains", variant: "body" },
        },
        proBtn: {
          type: "Button",
          props: {
            label: "Upgrade to Pro",
            variant: "primary",
            disabled: null,
          },
        },
        enterprise: {
          type: "Card",
          props: {
            title: "Enterprise",
            description: "Custom pricing",
            maxWidth: null,
            centered: null,
          },
          children: ["entContent"],
        },
        entContent: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "sm",
            align: null,
            justify: null,
          },
          children: ["e1", "e2", "e3", "e4", "entBtn"],
        },
        e1: {
          type: "Text",
          props: { text: "Everything in Pro", variant: "body" },
        },
        e2: {
          type: "Text",
          props: { text: "Unlimited storage", variant: "body" },
        },
        e3: {
          type: "Text",
          props: { text: "Dedicated support", variant: "body" },
        },
        e4: {
          type: "Text",
          props: { text: "SLA guarantees", variant: "body" },
        },
        entBtn: {
          type: "Button",
          props: {
            label: "Contact Sales",
            variant: "secondary",
            disabled: null,
          },
        },
      },
    },
  },

  {
    name: "Status Dashboard",
    description: "System status with alerts, a table, and an accordion",
    spec: {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: null,
            justify: null,
          },
          children: [
            "heading",
            "alertOk",
            "alertWarn",
            "sep",
            "table",
            "sep2",
            "accordion",
          ],
        },
        heading: {
          type: "Heading",
          props: { text: "System Status", level: "h1" },
        },
        alertOk: {
          type: "Alert",
          props: {
            title: "API",
            message: "All systems operational -- 99.98% uptime this month",
            type: "success",
          },
        },
        alertWarn: {
          type: "Alert",
          props: {
            title: "Database",
            message: "Elevated latency detected in us-east-1 region",
            type: "warning",
          },
        },
        sep: { type: "Separator", props: { orientation: null } },
        table: {
          type: "Table",
          props: {
            columns: ["Service", "Status", "Latency", "Uptime"],
            rows: [
              ["API Gateway", "Operational", "12ms", "99.99%"],
              ["Auth Service", "Operational", "8ms", "99.98%"],
              ["Database", "Degraded", "145ms", "99.85%"],
              ["CDN", "Operational", "3ms", "100%"],
              ["Workers", "Operational", "22ms", "99.97%"],
            ],
            caption: "Last updated 2 minutes ago",
          },
        },
        sep2: { type: "Separator", props: { orientation: null } },
        accordion: {
          type: "Accordion",
          props: {
            items: [
              {
                title: "What does 'Degraded' mean?",
                content:
                  "The service is still operational but experiencing slower response times than normal. We are actively investigating.",
              },
              {
                title: "How is uptime calculated?",
                content:
                  "Uptime is measured over the current calendar month based on successful health-check pings every 30 seconds.",
              },
              {
                title: "How do I subscribe to updates?",
                content:
                  "You can subscribe to incident notifications via email or webhook on the Settings page.",
              },
            ],
            type: "single",
          },
        },
      },
    },
  },

  {
    name: "Feature Comparison",
    description: "Tables inside an accordion for comparing plan tiers",
    spec: {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: null,
            justify: null,
          },
          children: ["heading", "subtitle", "accordion"],
        },
        heading: {
          type: "Heading",
          props: { text: "Feature Comparison", level: "h1" },
        },
        subtitle: {
          type: "Text",
          props: {
            text: "Expand each section to see how plans compare.",
            variant: "muted",
          },
        },
        accordion: {
          type: "Accordion",
          props: {
            items: [
              {
                title: "Projects & Team",
                content:
                  "Free: 3 projects, 1 member | Pro: Unlimited projects, 10 members | Enterprise: Unlimited everything",
              },
              {
                title: "Storage & Bandwidth",
                content:
                  "Free: 1 GB storage, 10 GB/mo bandwidth | Pro: 50 GB storage, 500 GB/mo | Enterprise: Unlimited",
              },
              {
                title: "Support & SLA",
                content:
                  "Free: Forum, no SLA | Pro: Email + Chat, 99.9% SLA | Enterprise: Dedicated Slack, 99.99% SLA",
              },
            ],
            type: "single",
          },
        },
      },
    },
  },

  // =========================================================================
  // Advanced: Registration form with cross-field validation & $template
  // =========================================================================
  {
    name: "Registration Form",
    description:
      "Cross-field validation, $template preview, and validateForm action",
    spec: {
      root: "card",
      state: {
        form: {
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          accountType: "personal",
          company: "",
        },
        result: null,
      },
      elements: {
        card: {
          type: "Card",
          props: {
            title: "Create Account",
            description: "Fill out the form below to register",
            maxWidth: "md",
            centered: null,
          },
          children: ["formStack"],
        },
        formStack: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "md",
            align: null,
            justify: null,
          },
          children: [
            "preview",
            "sep0",
            "nameInput",
            "emailInput",
            "passwordInput",
            "confirmInput",
            "sep1",
            "accountTypeRadio",
            "companyInput",
            "sep2",
            "actions",
            "statusText",
          ],
        },

        // $template live preview
        preview: {
          type: "Text",
          props: {
            text: {
              $template: "Welcome, ${/form/name}! Your email: ${/form/email}",
            },
            variant: "muted",
          },
          visible: { $state: "/form/name", neq: "" },
          children: [],
        },
        sep0: { type: "Separator", props: { orientation: null }, children: [] },

        nameInput: {
          type: "Input",
          props: {
            label: "Full Name",
            name: "name",
            type: "text",
            placeholder: "Jane Doe",
            value: { $bindState: "/form/name" },
            checks: [
              { type: "required", message: "Name is required" },
              {
                type: "minLength",
                args: { min: 2 },
                message: "Name must be at least 2 characters",
              },
            ],
            validateOn: "blur",
          },
          children: [],
        },
        emailInput: {
          type: "Input",
          props: {
            label: "Email",
            name: "email",
            type: "email",
            placeholder: "jane@example.com",
            value: { $bindState: "/form/email" },
            checks: [
              { type: "required", message: "Email is required" },
              { type: "email", message: "Enter a valid email address" },
            ],
            validateOn: "blur",
          },
          children: [],
        },
        passwordInput: {
          type: "Input",
          props: {
            label: "Password",
            name: "password",
            type: "password",
            placeholder: "At least 8 characters",
            value: { $bindState: "/form/password" },
            checks: [
              { type: "required", message: "Password is required" },
              {
                type: "minLength",
                args: { min: 8 },
                message: "Password must be at least 8 characters",
              },
            ],
            validateOn: "blur",
          },
          children: [],
        },
        confirmInput: {
          type: "Input",
          props: {
            label: "Confirm Password",
            name: "confirmPassword",
            type: "password",
            placeholder: "Re-enter your password",
            value: { $bindState: "/form/confirmPassword" },
            checks: [
              { type: "required", message: "Please confirm your password" },
              {
                type: "matches",
                args: { other: { $state: "/form/password" } },
                message: "Passwords must match",
              },
            ],
            validateOn: "blur",
          },
          children: [],
        },
        sep1: { type: "Separator", props: { orientation: null }, children: [] },

        accountTypeRadio: {
          type: "Radio",
          props: {
            label: "Account Type",
            name: "accountType",
            options: ["personal", "business"],
            value: { $bindState: "/form/accountType" },
            checks: null,
            validateOn: null,
          },
          children: [],
        },
        companyInput: {
          type: "Input",
          props: {
            label: "Company Name",
            name: "company",
            type: "text",
            placeholder: "Acme Inc.",
            value: { $bindState: "/form/company" },
            checks: [
              {
                type: "requiredIf",
                args: { field: { $state: "/form/accountType" } },
                message: "Company name is required for business accounts",
              },
            ],
            validateOn: "blur",
          },
          visible: { $state: "/form/accountType", eq: "business" },
          children: [],
        },
        sep2: { type: "Separator", props: { orientation: null }, children: [] },

        actions: {
          type: "Stack",
          props: {
            direction: "horizontal",
            gap: "sm",
            align: null,
            justify: "end",
          },
          children: ["submitBtn"],
        },
        submitBtn: {
          type: "Button",
          props: { label: "Register", variant: "primary", disabled: null },
          on: {
            press: [
              {
                action: "validateForm",
                params: { statePath: "/result" },
              },
            ],
          },
          children: [],
        },

        // Validation result
        statusText: {
          type: "Alert",
          props: {
            title: "Validation Result",
            message: {
              $cond: { $state: "/result/valid", eq: true },
              $then: "All fields are valid -- ready to submit!",
              $else: "Please fix the errors above before submitting.",
            },
            type: {
              $cond: { $state: "/result/valid", eq: true },
              $then: "success",
              $else: "error",
            },
          },
          visible: { $state: "/result", neq: null },
          children: [],
        },
      },
    },
  },

  // =========================================================================
  // Advanced: Cascading selects with watchers & $computed
  // =========================================================================
  {
    name: "Cascading Selects",
    description:
      "Watchers reset dependent fields, $computed derives display values",
    spec: {
      root: "card",
      state: {
        form: { country: "", city: "" },
        availableCities: [],
      },
      elements: {
        card: {
          type: "Card",
          props: {
            title: "Shipping Address",
            description: "Select your country to load available cities",
            maxWidth: "md",
            centered: null,
          },
          children: ["formStack"],
        },
        formStack: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "md",
            align: null,
            justify: null,
          },
          children: [
            "countrySelect",
            "citySelect",
            "sep",
            "addressPreview",
            "templatePreview",
          ],
        },

        countrySelect: {
          type: "Select",
          props: {
            label: "Country",
            name: "country",
            options: ["US", "Canada", "UK", "Germany", "Japan"],
            placeholder: "Choose a country",
            value: { $bindState: "/form/country" },
            checks: [{ type: "required", message: "Country is required" }],
            validateOn: "change",
          },
          watch: {
            "/form/country": [
              {
                action: "setState",
                params: {
                  statePath: "/availableCities",
                  value: {
                    $computed: "citiesForCountry",
                    args: { country: { $state: "/form/country" } },
                  },
                },
              },
              {
                action: "setState",
                params: { statePath: "/form/city", value: "" },
              },
            ],
          },
          children: [],
        },

        citySelect: {
          type: "Select",
          props: {
            label: "City",
            name: "city",
            options: { $state: "/availableCities" },
            placeholder: "Select a city",
            value: { $bindState: "/form/city" },
            checks: [{ type: "required", message: "City is required" }],
            validateOn: "change",
          },
          children: [],
        },
        sep: { type: "Separator", props: { orientation: null }, children: [] },

        // $computed formatted address
        addressPreview: {
          type: "Heading",
          props: {
            text: {
              $computed: "formatAddress",
              args: {
                city: { $state: "/form/city" },
                country: { $state: "/form/country" },
              },
            },
            level: "h3",
          },
          children: [],
        },

        // $template string interpolation
        templatePreview: {
          type: "Text",
          props: {
            text: {
              $template:
                "Shipping to: ${/form/city} in ${/form/country}. Cities available: ${/availableCities}",
            },
            variant: "muted",
          },
          visible: { $state: "/form/country", neq: "" },
          children: [],
        },
      },
    },
  },
];

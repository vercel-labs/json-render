import { z } from "zod";

const styleSchema = z.record(z.string(), z.any()).nullable();

/**
 * Standard component definitions for React Email catalogs.
 *
 * These define the available email components with their Zod prop schemas.
 * All components render using @react-email/components primitives.
 */
export const standardComponentDefinitions = {
  // ==========================================================================
  // Document Structure
  // ==========================================================================

  Html: {
    props: z.object({
      lang: z.string().nullable(),
      dir: z.enum(["ltr", "rtl"]).nullable(),
    }),
    slots: ["default"],
    description:
      "Top-level HTML email wrapper. Must be the root element. Children should include Head and Body.",
    example: { lang: "en", dir: "ltr" },
  },

  Head: {
    props: z.object({}),
    slots: ["default"],
    description:
      "Email head section. Place inside Html. Can contain metadata but typically left empty.",
    example: {},
  },

  Body: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Email body wrapper. Place inside Html after Head. Contains all visible email content.",
    example: { style: { backgroundColor: "#f6f9fc" } },
  },

  Container: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Constrains content width for email clients. Place inside Body. Typically max-width 600px.",
    example: {
      style: {
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px 0 48px",
      },
    },
  },

  Section: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Groups related content. Renders as a table-based section for email compatibility.",
    example: { style: { padding: "24px", backgroundColor: "#ffffff" } },
  },

  Row: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Horizontal layout row. Use inside Section for multi-column layouts.",
    example: { style: {} },
  },

  Column: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Column within a Row. Set width via style for proportional layouts.",
    example: { style: { width: "50%" } },
  },

  // ==========================================================================
  // Content Components
  // ==========================================================================

  Heading: {
    props: z.object({
      text: z.string(),
      as: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).nullable(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Heading text at various levels. h1 is largest, h6 is smallest.",
    example: { text: "Welcome!", as: "h1" },
  },

  Text: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Body text paragraph. Use style for font size, color, weight, and alignment.",
    example: { text: "Thank you for signing up." },
  },

  Link: {
    props: z.object({
      text: z.string(),
      href: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Hyperlink with visible text and a URL.",
    example: {
      text: "Visit our website",
      href: "https://example.com",
      style: { color: "#2563eb" },
    },
  },

  Button: {
    props: z.object({
      text: z.string(),
      href: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Call-to-action button rendered as a link styled as a button. Provide text and href.",
    example: {
      text: "Get Started",
      href: "https://example.com",
      style: {
        backgroundColor: "#5F51E8",
        borderRadius: "3px",
        color: "#fff",
        padding: "12px 20px",
      },
    },
  },

  Image: {
    props: z.object({
      src: z.string(),
      alt: z.string().nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Image from a URL. src must be a fully qualified URL. Specify width and height for consistent rendering.",
    example: {
      src: "https://picsum.photos/400/200?random=1",
      alt: "Hero image",
      width: 400,
      height: 200,
    },
  },

  Hr: {
    props: z.object({
      style: styleSchema,
    }),
    slots: [],
    description: "Horizontal rule separator between content sections.",
    example: {
      style: { borderColor: "#e6ebf1", margin: "20px 0" },
    },
  },

  // ==========================================================================
  // Utility Components
  // ==========================================================================

  Preview: {
    props: z.object({
      text: z.string(),
    }),
    slots: [],
    description:
      "Preview text shown in email client inboxes before the email is opened. Place inside Html.",
    example: { text: "You have a new message from Acme Corp" },
  },

  Markdown: {
    props: z.object({
      content: z.string(),
      markdownContainerStyles: styleSchema,
      markdownCustomStyles: z.record(z.string(), z.any()).nullable(),
    }),
    slots: [],
    description:
      "Renders markdown content as email-safe HTML. Supports headings, paragraphs, lists, links, bold, italic, and code.",
    example: {
      content: "# Hello\n\nThis is **bold** and *italic* text.",
    },
  },
};

export type StandardComponentDefinitions = typeof standardComponentDefinitions;

export type StandardComponentProps<
  K extends keyof StandardComponentDefinitions,
> = StandardComponentDefinitions[K]["props"] extends { _output: infer O }
  ? O
  : z.output<StandardComponentDefinitions[K]["props"]>;

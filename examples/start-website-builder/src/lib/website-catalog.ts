import { z } from "zod";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const ctaSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const websiteComponentDefinitions = {
  Header: {
    props: z.object({
      brand: z.string(),
      links: z.array(linkSchema),
      variant: z.enum(["simple", "centered"]).nullable(),
    }),
    description:
      "Site header / navigation bar. Simple: brand left, links right. Centered: brand centered above links.",
    example: {
      brand: "Acme Inc",
      links: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
      variant: "simple",
    },
  },

  Hero: {
    props: z.object({
      headline: z.string(),
      description: z.string(),
      primaryCta: ctaSchema.nullable(),
      secondaryCta: ctaSchema.nullable(),
      badge: z.string().nullable(),
      variant: z.enum(["centered", "left-aligned"]).nullable(),
    }),
    description:
      "Landing hero section with headline, description, and call-to-action buttons.",
    example: {
      headline: "Build something great",
      description: "A modern platform for modern teams.",
      primaryCta: { label: "Get Started", href: "/contact" },
      variant: "centered",
    },
  },

  Features: {
    props: z.object({
      headline: z.string().nullable(),
      description: z.string().nullable(),
      items: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
        }),
      ),
      columns: z.number().nullable(),
      variant: z.enum(["cards", "simple"]).nullable(),
    }),
    description:
      "Feature highlights section. Cards: bordered cards per item. Simple: clean text layout.",
    example: {
      headline: "Why choose us",
      items: [
        { title: "Fast", description: "Blazing performance." },
        { title: "Secure", description: "Enterprise-grade security." },
        { title: "Simple", description: "Easy to use." },
      ],
      columns: 3,
      variant: "cards",
    },
  },

  Team: {
    props: z.object({
      headline: z.string().nullable(),
      description: z.string().nullable(),
      members: z.array(
        z.object({
          name: z.string(),
          role: z.string(),
          bio: z.string().nullable(),
        }),
      ),
      variant: z.enum(["grid", "list"]).nullable(),
    }),
    description: "Team members section. Grid: card grid. List: vertical list.",
    example: {
      headline: "Our Team",
      members: [
        { name: "Alice", role: "CEO", bio: null },
        { name: "Bob", role: "CTO", bio: null },
      ],
      variant: "grid",
    },
  },

  Testimonials: {
    props: z.object({
      headline: z.string().nullable(),
      items: z.array(
        z.object({
          quote: z.string(),
          author: z.string(),
          role: z.string().nullable(),
        }),
      ),
    }),
    description: "Customer testimonials / quotes section.",
    example: {
      headline: "What people say",
      items: [
        {
          quote: "Amazing product!",
          author: "Jane",
          role: "CEO at Startup",
        },
      ],
    },
  },

  ContactForm: {
    props: z.object({
      headline: z.string().nullable(),
      description: z.string().nullable(),
      fields: z.array(
        z.object({
          label: z.string(),
          type: z.enum(["text", "email", "textarea"]),
          placeholder: z.string().nullable(),
        }),
      ),
      submitLabel: z.string(),
    }),
    description: "Contact form section with configurable fields.",
    example: {
      headline: "Get in Touch",
      fields: [
        { label: "Name", type: "text", placeholder: "Your name" },
        { label: "Email", type: "email", placeholder: "you@example.com" },
        { label: "Message", type: "textarea", placeholder: "Your message" },
      ],
      submitLabel: "Send",
    },
  },

  Footer: {
    props: z.object({
      brand: z.string().nullable(),
      links: z.array(linkSchema).nullable(),
      copyright: z.string().nullable(),
      variant: z.enum(["simple", "columns"]).nullable(),
    }),
    description:
      "Site footer. Simple: centered single row. Columns: multi-column layout.",
    example: {
      brand: "Acme Inc",
      copyright: "2026 Acme Inc.",
      variant: "simple",
    },
  },

  CTA: {
    props: z.object({
      headline: z.string(),
      description: z.string().nullable(),
      buttonLabel: z.string(),
      buttonHref: z.string(),
      variant: z.enum(["banner", "centered"]).nullable(),
    }),
    description:
      "Call-to-action section. Banner: full-width colored background. Centered: clean centered layout.",
    example: {
      headline: "Ready to get started?",
      buttonLabel: "Contact Us",
      buttonHref: "/contact",
      variant: "centered",
    },
  },
};

export type WebsiteProps<K extends keyof typeof websiteComponentDefinitions> =
  z.output<(typeof websiteComponentDefinitions)[K]["props"]>;

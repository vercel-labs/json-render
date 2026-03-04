import { z } from "zod";

const styleSchema = z.record(z.string(), z.any()).nullable();
const linkArraySchema = z.array(
  z.object({
    text: z.string(),
    href: z.string(),
  }),
);
const imageItemSchema = z.object({
  src: z.string(),
  alt: z.string().nullable().optional(),
  href: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});
const statItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  helper: z.string().nullable().optional(),
});
const articleItemSchema = z.object({
  title: z.string(),
  href: z.string(),
  excerpt: z.string().nullable().optional(),
  meta: z.string().nullable().optional(),
});
const pricingTierSchema = z.object({
  name: z.string(),
  price: z.string(),
  period: z.string().nullable().optional(),
  features: z.array(z.string()),
  ctaText: z.string().nullable().optional(),
  ctaHref: z.string().nullable().optional(),
  highlighted: z.boolean().nullable().optional(),
  style: styleSchema.optional(),
});
const productItemSchema = z.object({
  name: z.string(),
  price: z.string(),
  href: z.string(),
  imageSrc: z.string(),
  imageAlt: z.string().nullable().optional(),
});
const orderLineItemSchema = z.object({
  name: z.string(),
  qty: z.number(),
  price: z.string(),
});

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

  ContainerCard: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Pre-styled container variant for card-like email blocks (rounded, white background).",
    example: {
      style: {
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        padding: "24px",
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

  SectionHero: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Hero section variant with larger spacing for top-of-email content.",
    example: {
      style: {
        padding: "32px 24px",
        backgroundColor: "#f8fafc",
      },
    },
  },

  SectionMuted: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Muted section variant for secondary content blocks and disclaimers.",
    example: {
      style: {
        padding: "20px 24px",
        backgroundColor: "#f3f4f6",
      },
    },
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

  Grid2: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Two-column grid row helper. Place two Column children inside for side-by-side layouts.",
    example: { style: { width: "100%" } },
  },

  Grid3: {
    props: z.object({
      style: styleSchema,
    }),
    slots: ["default"],
    description:
      "Three-column grid row helper. Place three Column children inside for card layouts.",
    example: { style: { width: "100%" } },
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

  Header1: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Convenience heading component mapped to h1.",
    example: { text: "Main title" },
  },

  Header2: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Convenience heading component mapped to h2.",
    example: { text: "Section title" },
  },

  Header3: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Convenience heading component mapped to h3.",
    example: { text: "Sub-section title" },
  },

  HeadingHero: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Large hero heading convenience component mapped to h1.",
    example: { text: "Welcome aboard" },
  },

  HeadingSection: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Section heading convenience component mapped to h2.",
    example: { text: "What to do next" },
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

  ImageHero: {
    props: z.object({
      src: z.string(),
      alt: z.string().nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Hero image variant, typically full-width with rounded corners.",
    example: {
      src: "https://picsum.photos/600/240?random=2",
      alt: "Hero image",
      width: 600,
      height: 240,
    },
  },

  ImageAvatar: {
    props: z.object({
      src: z.string(),
      alt: z.string().nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Avatar image variant for profile-style circular images.",
    example: {
      src: "https://picsum.photos/80/80?random=3",
      alt: "Profile avatar",
      width: 80,
      height: 80,
    },
  },

  ImageThumbnail: {
    props: z.object({
      src: z.string(),
      alt: z.string().nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Thumbnail image variant for product cards and galleries.",
    example: {
      src: "https://picsum.photos/180/120?random=4",
      alt: "Thumbnail",
      width: 180,
      height: 120,
    },
  },

  Gallery2: {
    props: z.object({
      items: z.array(imageItemSchema).min(2).max(2),
      style: styleSchema,
      imageStyle: styleSchema,
    }),
    slots: [],
    description: "Two-image gallery block rendered in a single row.",
    example: {
      items: [
        { src: "https://picsum.photos/260/160?random=11", alt: "Image 1" },
        { src: "https://picsum.photos/260/160?random=12", alt: "Image 2" },
      ],
    },
  },

  Gallery3: {
    props: z.object({
      items: z.array(imageItemSchema).min(3).max(3),
      style: styleSchema,
      imageStyle: styleSchema,
    }),
    slots: [],
    description: "Three-image gallery block rendered in a single row.",
    example: {
      items: [
        { src: "https://picsum.photos/180/120?random=13", alt: "Image 1" },
        { src: "https://picsum.photos/180/120?random=14", alt: "Image 2" },
        { src: "https://picsum.photos/180/120?random=15", alt: "Image 3" },
      ],
    },
  },

  Gallery4: {
    props: z.object({
      items: z.array(imageItemSchema).min(4).max(4),
      style: styleSchema,
      imageStyle: styleSchema,
    }),
    slots: [],
    description: "Four-image gallery block rendered in a 2x2 grid.",
    example: {
      items: [
        { src: "https://picsum.photos/240/140?random=16", alt: "Image 1" },
        { src: "https://picsum.photos/240/140?random=17", alt: "Image 2" },
        { src: "https://picsum.photos/240/140?random=18", alt: "Image 3" },
        { src: "https://picsum.photos/240/140?random=19", alt: "Image 4" },
      ],
    },
  },

  GalleryMosaic: {
    props: z.object({
      items: z.array(imageItemSchema).min(2).max(6),
      style: styleSchema,
      imageStyle: styleSchema,
    }),
    slots: [],
    description:
      "Flexible gallery component for 2-6 images laid out in responsive rows.",
    example: {
      items: [
        { src: "https://picsum.photos/240/160?random=20", alt: "Image 1" },
        { src: "https://picsum.photos/240/160?random=21", alt: "Image 2" },
        { src: "https://picsum.photos/240/160?random=22", alt: "Image 3" },
      ],
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

  DividerSoft: {
    props: z.object({
      style: styleSchema,
    }),
    slots: [],
    description: "Soft divider line for subtle section separation.",
    example: {
      style: { borderColor: "#eef2f7", margin: "16px 0" },
    },
  },

  DividerDashed: {
    props: z.object({
      style: styleSchema,
    }),
    slots: [],
    description: "Dashed divider variant for visual rhythm between blocks.",
    example: {
      style: { borderTop: "1px dashed #d1d5db", margin: "20px 0" },
    },
  },

  FooterSimple: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Simple footer text block for legal/disclaimer lines.",
    example: { text: "© 2026 Acme. All rights reserved." },
  },

  FooterLinks: {
    props: z.object({
      text: z.string().nullable(),
      links: linkArraySchema,
      style: styleSchema,
      linkStyle: styleSchema,
    }),
    slots: [],
    description:
      "Footer with optional leading text and a list of links (privacy, terms, unsubscribe).",
    example: {
      text: "Manage your preferences:",
      links: [
        { text: "Privacy", href: "https://example.com/privacy" },
        { text: "Unsubscribe", href: "https://example.com/unsubscribe" },
      ],
    },
  },

  ListBulleted: {
    props: z.object({
      items: z.array(z.string()),
      style: styleSchema,
      itemStyle: styleSchema,
    }),
    slots: [],
    description: "Bulleted list block for features, benefits, or reminders.",
    example: {
      items: ["Fast onboarding", "Automated workflows", "24/7 support"],
    },
  },

  ListNumbered: {
    props: z.object({
      items: z.array(z.string()),
      style: styleSchema,
      itemStyle: styleSchema,
    }),
    slots: [],
    description: "Numbered list block for step-by-step instructions.",
    example: {
      items: ["Create your profile", "Verify your email", "Start exploring"],
    },
  },

  InlineCode: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Inline code snippet for coupon codes, tokens, and technical identifiers.",
    example: { text: "WELCOME2026" },
  },

  InlineCodeMuted: {
    props: z.object({
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Muted inline code variant for secondary technical details.",
    example: { text: "build_01HQZ7" },
  },

  // ==========================================================================
  // Composable Blocks
  // ==========================================================================

  ArticleCard: {
    props: z.object({
      title: z.string(),
      excerpt: z.string(),
      href: z.string(),
      imageSrc: z.string().nullable(),
      imageAlt: z.string().nullable(),
      meta: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Article card with optional image, excerpt, and metadata.",
    example: {
      title: "Product update",
      excerpt: "See what changed this month.",
      href: "https://example.com/blog/update",
    },
  },

  ArticleCompact: {
    props: z.object({
      title: z.string(),
      href: z.string(),
      meta: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Compact article link row with optional meta text.",
    example: {
      title: "How to onboard users faster",
      href: "https://example.com/blog/onboarding",
      meta: "5 min read",
    },
  },

  ArticleFeature: {
    props: z.object({
      title: z.string(),
      excerpt: z.string(),
      href: z.string(),
      imageSrc: z.string().nullable(),
      imageAlt: z.string().nullable(),
      ctaText: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Featured article block with optional image and CTA text.",
    example: {
      title: "The 2026 guide to retention",
      excerpt: "Benchmark data and tactical takeaways.",
      href: "https://example.com/blog/retention-guide",
      ctaText: "Read now",
    },
  },

  ArticleListItem: {
    props: z.object({
      title: z.string(),
      href: z.string(),
      excerpt: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Single article list item with optional short excerpt.",
    example: {
      title: "Weekly changelog",
      href: "https://example.com/changelog",
    },
  },

  ArticleHero: {
    props: z.object({
      eyebrow: z.string().nullable(),
      title: z.string(),
      excerpt: z.string(),
      ctaText: z.string(),
      href: z.string(),
      imageSrc: z.string().nullable(),
      imageAlt: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Hero-style article block for top placement in newsletters.",
    example: {
      eyebrow: "Editor's pick",
      title: "Our biggest launch yet",
      excerpt: "Everything you need to know in one place.",
      ctaText: "Read the story",
      href: "https://example.com/blog/launch",
    },
  },

  ArticleDigest: {
    props: z.object({
      title: z.string().nullable(),
      items: z.array(articleItemSchema).min(2).max(8),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Digest list of article links with optional excerpts and metadata.",
    example: {
      title: "This week on the blog",
      items: [
        { title: "Post one", href: "https://example.com/1" },
        { title: "Post two", href: "https://example.com/2" },
      ],
    },
  },

  FeatureRow: {
    props: z.object({
      title: z.string(),
      description: z.string(),
      href: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Single feature row with title and description.",
    example: {
      title: "Team workspaces",
      description: "Collaborate across departments in real time.",
    },
  },

  FeatureCard: {
    props: z.object({
      icon: z.string().nullable(),
      title: z.string(),
      description: z.string(),
      href: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Feature card with optional icon and link.",
    example: {
      icon: "🚀",
      title: "Fast setup",
      description: "Get started in minutes with templates.",
    },
  },

  FeatureIconText: {
    props: z.object({
      icon: z.string(),
      title: z.string(),
      text: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Icon + text feature row for benefit highlights.",
    example: {
      icon: "🔒",
      title: "Enterprise security",
      text: "SSO, SAML, and fine-grained permissions.",
    },
  },

  FeatureBulletList: {
    props: z.object({
      title: z.string().nullable(),
      items: z.array(z.string()).min(2).max(10),
      style: styleSchema,
    }),
    slots: [],
    description: "Bulleted feature checklist block.",
    example: {
      title: "Included in all plans",
      items: ["Unlimited projects", "API access", "Priority support"],
    },
  },

  FeatureHighlight: {
    props: z.object({
      title: z.string(),
      text: z.string(),
      ctaText: z.string().nullable(),
      ctaHref: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Highlighted feature callout with optional CTA.",
    example: {
      title: "New AI assistant",
      text: "Draft content and automate repetitive work.",
      ctaText: "Try it now",
      ctaHref: "https://example.com/features/ai",
    },
  },

  StatsRow: {
    props: z.object({
      title: z.string().nullable(),
      stats: z.array(statItemSchema).min(2).max(4),
      style: styleSchema,
    }),
    slots: [],
    description: "Horizontal stats row for KPI highlights.",
    example: {
      title: "Results this quarter",
      stats: [
        { label: "Revenue", value: "$2.4M" },
        { label: "NPS", value: "68" },
      ],
    },
  },

  StatsHighlight: {
    props: z.object({
      value: z.string(),
      label: z.string(),
      description: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Single large stat highlight block.",
    example: {
      value: "99.98%",
      label: "Uptime",
      description: "Measured over the last 90 days",
    },
  },

  TestimonialQuote: {
    props: z.object({
      quote: z.string(),
      author: z.string(),
      role: z.string().nullable(),
      avatarSrc: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "Quote-focused testimonial with optional avatar and role.",
    example: {
      quote: "This doubled our output in two weeks.",
      author: "Alex Kim",
      role: "Head of Ops",
    },
  },

  TestimonialCard: {
    props: z.object({
      quote: z.string(),
      author: z.string(),
      company: z.string().nullable(),
      href: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Card-style testimonial with optional company and case-study link.",
    example: {
      quote: "The easiest migration we've done.",
      author: "Jamie Chen",
      company: "Northstar",
      href: "https://example.com/case-study",
    },
  },

  FeedbackRequest: {
    props: z.object({
      question: z.string(),
      ctaText: z.string(),
      ctaHref: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description: "Simple feedback request with one call-to-action.",
    example: {
      question: "How was your onboarding experience?",
      ctaText: "Share feedback",
      ctaHref: "https://example.com/feedback",
    },
  },

  FeedbackScale: {
    props: z.object({
      question: z.string(),
      lowLabel: z.string().nullable(),
      highLabel: z.string().nullable(),
      baseHref: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "1-5 feedback scale linking to a base URL with score query param.",
    example: {
      question: "How likely are you to recommend us?",
      lowLabel: "Not likely",
      highLabel: "Very likely",
      baseHref: "https://example.com/nps",
    },
  },

  FeedbackCTA: {
    props: z.object({
      title: z.string(),
      text: z.string(),
      ctaText: z.string(),
      ctaHref: z.string(),
      secondaryText: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Feedback section with title, description, CTA, and optional helper text.",
    example: {
      title: "Help us improve",
      text: "Tell us what worked and what did not.",
      ctaText: "Give feedback",
      ctaHref: "https://example.com/feedback",
    },
  },

  PricingTier: {
    props: pricingTierSchema,
    slots: [],
    description: "Single pricing tier card with features and optional CTA.",
    example: {
      name: "Pro",
      price: "$49",
      period: "/month",
      features: ["Unlimited projects", "Advanced analytics"],
      ctaText: "Start free trial",
      ctaHref: "https://example.com/pricing",
      highlighted: true,
    },
  },

  PricingComparison: {
    props: z.object({
      title: z.string().nullable(),
      tiers: z.array(pricingTierSchema).min(2).max(3),
      style: styleSchema,
    }),
    slots: [],
    description: "Pricing comparison block for two or three plans.",
    example: {
      title: "Choose your plan",
      tiers: [
        { name: "Starter", price: "$19", features: ["Basic support"] },
        { name: "Pro", price: "$49", features: ["Priority support"] },
      ],
    },
  },

  ProductCard: {
    props: productItemSchema.extend({
      description: z.string().nullable().optional(),
      ctaText: z.string().nullable().optional(),
      style: styleSchema,
    }),
    slots: [],
    description: "Product card with image, price, and link.",
    example: {
      name: "Trail shoes",
      price: "$129",
      href: "https://example.com/products/trail-shoes",
      imageSrc: "https://picsum.photos/320/220?random=31",
    },
  },

  ProductGrid2: {
    props: z.object({
      title: z.string().nullable(),
      items: z.array(productItemSchema).min(2).max(2),
      style: styleSchema,
    }),
    slots: [],
    description: "Two-product ecommerce grid.",
    example: {
      title: "Best sellers",
      items: [
        {
          name: "Item A",
          price: "$39",
          href: "https://example.com/a",
          imageSrc: "https://picsum.photos/260/160?random=32",
        },
        {
          name: "Item B",
          price: "$49",
          href: "https://example.com/b",
          imageSrc: "https://picsum.photos/260/160?random=33",
        },
      ],
    },
  },

  ProductGrid3: {
    props: z.object({
      title: z.string().nullable(),
      items: z.array(productItemSchema).min(3).max(3),
      style: styleSchema,
    }),
    slots: [],
    description: "Three-product ecommerce grid.",
    example: {
      title: "New arrivals",
      items: [
        {
          name: "Item A",
          price: "$39",
          href: "https://example.com/a",
          imageSrc: "https://picsum.photos/200/140?random=34",
        },
        {
          name: "Item B",
          price: "$49",
          href: "https://example.com/b",
          imageSrc: "https://picsum.photos/200/140?random=35",
        },
        {
          name: "Item C",
          price: "$59",
          href: "https://example.com/c",
          imageSrc: "https://picsum.photos/200/140?random=36",
        },
      ],
    },
  },

  OrderSummary: {
    props: z.object({
      orderNumber: z.string(),
      items: z.array(orderLineItemSchema).min(1).max(10),
      total: z.string(),
      ctaText: z.string().nullable(),
      ctaHref: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Order summary block with line items, total, and optional CTA.",
    example: {
      orderNumber: "ORD-10293",
      items: [
        { name: "Trail shoes", qty: 1, price: "$129" },
        { name: "Socks", qty: 2, price: "$20" },
      ],
      total: "$149",
      ctaText: "Track order",
      ctaHref: "https://example.com/orders/ORD-10293",
    },
  },

  AbandonedCart: {
    props: z.object({
      customerName: z.string().nullable(),
      items: z.array(productItemSchema).min(1).max(3),
      ctaText: z.string(),
      ctaHref: z.string(),
      style: styleSchema,
    }),
    slots: [],
    description:
      "Abandoned cart recovery block with products and checkout CTA.",
    example: {
      customerName: "Taylor",
      items: [
        {
          name: "Trail shoes",
          price: "$129",
          href: "https://example.com/products/trail-shoes",
          imageSrc: "https://picsum.photos/260/160?random=37",
        },
      ],
      ctaText: "Complete purchase",
      ctaHref: "https://example.com/cart",
    },
  },

  MarketingHero: {
    props: z.object({
      eyebrow: z.string().nullable(),
      title: z.string(),
      text: z.string(),
      ctaText: z.string(),
      ctaHref: z.string(),
      secondaryText: z.string().nullable(),
      imageSrc: z.string().nullable(),
      imageAlt: z.string().nullable(),
      style: styleSchema,
    }),
    slots: [],
    description: "General-purpose marketing hero with CTA and optional image.",
    example: {
      eyebrow: "Limited launch",
      title: "Grow faster with automation",
      text: "Turn repetitive work into one-click flows.",
      ctaText: "Start free",
      ctaHref: "https://example.com/signup",
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

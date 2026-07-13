import type { StartAppSpec } from "@json-render/start";

export const defaultSpec: StartAppSpec = {
  metadata: {
    title: {
      default: "Acme Inc",
      template: "%s | Acme Inc",
    },
    description: "We build the future of software.",
    icons: "/icon.svg",
  },

  state: {},

  layouts: {
    main: {
      root: "wrapper",
      elements: {
        wrapper: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "none",
            align: "stretch",
            className: "min-h-screen",
          },
          children: ["header", "content", "footer"],
        },
        header: {
          type: "Header",
          props: {
            brand: "Acme Inc",
            links: [
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ],
            variant: "simple",
          },
        },
        content: {
          type: "Slot",
          props: {},
        },
        footer: {
          type: "Footer",
          props: {
            brand: "Acme Inc",
            links: [
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ],
            copyright: "2026 Acme Inc. All rights reserved.",
            variant: "simple",
          },
        },
      },
    },
  },

  routes: {
    "/": {
      layout: "main",
      metadata: {
        title: "Home",
        description: "Welcome to Acme Inc - we build the future of software.",
      },
      page: {
        root: "page",
        elements: {
          page: {
            type: "Stack",
            props: {
              direction: "vertical",
              gap: "none",
              align: "stretch",
            },
            children: ["hero", "features", "testimonials", "cta"],
          },
          hero: {
            type: "Hero",
            props: {
              headline: "Build the future with Acme",
              description:
                "We help companies ship better software, faster. Our platform provides the tools, infrastructure, and insights you need to build world-class products.",
              primaryCta: { label: "Get Started", href: "/contact" },
              secondaryCta: { label: "Learn More", href: "/about" },
              badge: "Now in Beta",
              variant: "centered",
            },
          },
          features: {
            type: "Features",
            props: {
              headline: "Why Acme?",
              description:
                "Everything you need to build, deploy, and scale your applications.",
              items: [
                {
                  title: "Lightning Fast",
                  description:
                    "Optimized for speed with edge-first architecture and smart caching.",
                },
                {
                  title: "Secure by Default",
                  description:
                    "Enterprise-grade security with end-to-end encryption and SOC 2 compliance.",
                },
                {
                  title: "Developer First",
                  description:
                    "APIs, SDKs, and CLI tools designed to fit your workflow perfectly.",
                },
              ],
              columns: 3,
              variant: "cards",
            },
          },
          testimonials: {
            type: "Testimonials",
            props: {
              headline: "Trusted by industry leaders",
              items: [
                {
                  quote:
                    "Acme has completely transformed how we ship products. Our deployment time went from hours to minutes.",
                  author: "Jordan Lee",
                  role: "VP Engineering at Globex",
                },
                {
                  quote:
                    "The developer experience is unmatched. Our team onboarded in a single afternoon.",
                  author: "Priya Patel",
                  role: "CTO at Initech",
                },
                {
                  quote:
                    "We cut our infrastructure costs by 40% within the first quarter of switching to Acme.",
                  author: "Sam Ortiz",
                  role: "Head of Platform at Hooli",
                },
              ],
            },
          },
          cta: {
            type: "CTA",
            props: {
              headline: "Ready to get started?",
              description:
                "Join thousands of teams building better software with Acme.",
              buttonLabel: "Contact Us",
              buttonHref: "/contact",
              variant: "banner",
            },
          },
        },
      },
    },

    "/about": {
      layout: "main",
      metadata: {
        title: "About",
        description:
          "Learn about our mission, values, and the team behind Acme.",
      },
      page: {
        root: "page",
        elements: {
          page: {
            type: "Stack",
            props: {
              direction: "vertical",
              gap: "none",
              align: "stretch",
            },
            children: ["hero", "features", "team", "cta"],
          },
          hero: {
            type: "Hero",
            props: {
              headline: "About Acme Inc",
              description:
                "Founded in 2024, we are on a mission to make software development accessible to everyone. We believe the best tools should be simple, powerful, and delightful to use.",
              variant: "centered",
              primaryCta: null,
              secondaryCta: null,
              badge: null,
            },
          },
          features: {
            type: "Features",
            props: {
              headline: "Our Values",
              items: [
                {
                  title: "Simplicity",
                  description:
                    "We remove complexity so you can focus on building great products.",
                },
                {
                  title: "Transparency",
                  description:
                    "Open communication, honest pricing, and clear documentation.",
                },
                {
                  title: "Craftsmanship",
                  description:
                    "Every detail matters. We sweat the small stuff so you don't have to.",
                },
              ],
              columns: 3,
              variant: "simple",
              description: null,
            },
          },
          team: {
            type: "Team",
            props: {
              headline: "Meet the Team",
              description:
                "The people behind Acme who are passionate about building great developer tools.",
              members: [
                {
                  name: "Alex Chen",
                  role: "CEO & Co-founder",
                  bio: "Previously at Vercel and Google. Passionate about developer experience.",
                },
                {
                  name: "Sarah Kim",
                  role: "CTO & Co-founder",
                  bio: "Built distributed systems at AWS. Loves solving hard infrastructure problems.",
                },
                {
                  name: "Marcus Rivera",
                  role: "Head of Design",
                  bio: "Former design lead at Figma and Stripe. Obsessed with clarity and craft.",
                },
              ],
              variant: "grid",
            },
          },
          cta: {
            type: "CTA",
            props: {
              headline: "Want to join us?",
              description:
                "We are always looking for talented people to join our team.",
              buttonLabel: "Get in Touch",
              buttonHref: "/contact",
              variant: "centered",
            },
          },
        },
      },
    },

    "/contact": {
      layout: "main",
      metadata: {
        title: "Contact",
        description: "Get in touch with the Acme team.",
      },
      page: {
        root: "page",
        elements: {
          page: {
            type: "Stack",
            props: {
              direction: "vertical",
              gap: "none",
              align: "stretch",
            },
            children: ["form"],
          },
          form: {
            type: "ContactForm",
            props: {
              headline: "Get in Touch",
              description:
                "Have a question or want to work with us? Fill out the form below and we'll get back to you within 24 hours.",
              fields: [
                {
                  label: "Name",
                  type: "text" as const,
                  placeholder: "Your name",
                },
                {
                  label: "Email",
                  type: "email" as const,
                  placeholder: "you@example.com",
                },
                {
                  label: "Message",
                  type: "textarea" as const,
                  placeholder: "Tell us about your project...",
                },
              ],
              submitLabel: "Send Message",
            },
          },
        },
      },
    },
  },
};

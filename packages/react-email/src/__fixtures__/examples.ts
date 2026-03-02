import type { Spec } from "@json-render/core";

export interface Example {
  name: string;
  label: string;
  description: string;
  spec: Spec;
}

// Images sourced from the react-email demo; URLs are only used for spec
// structure validation in tests and are not fetched at runtime.
const staticUrl = "https://react-email-demo-bdj5iju9r-resend.vercel.app/static";

export const examples: Example[] = [
  {
    name: "vercel-invite",
    label: "Vercel Invite",
    description: "Team invitation email with avatars and CTA",
    spec: {
      root: "html",
      elements: {
        html: {
          type: "Html",
          props: { lang: "en", dir: null },
          children: ["head", "preview", "body"],
        },
        head: {
          type: "Head",
          props: {},
          children: [],
        },
        preview: {
          type: "Preview",
          props: { text: "Join Alan on Vercel" },
          children: [],
        },
        body: {
          type: "Body",
          props: {
            style: {
              backgroundColor: "#ffffff",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
              margin: "0 auto",
              padding: "0 8px",
            },
          },
          children: ["container"],
        },
        container: {
          type: "Container",
          props: {
            style: {
              maxWidth: "465px",
              margin: "40px auto",
              border: "1px solid #eaeaea",
              borderRadius: "4px",
              padding: "20px",
            },
          },
          children: [
            "logo-section",
            "heading",
            "greeting-text",
            "invite-text",
            "avatar-section",
            "button-section",
            "url-text",
            "invite-link",
            "hr",
            "footer-text",
          ],
        },
        "logo-section": {
          type: "Section",
          props: { style: { marginTop: "32px" } },
          children: ["logo"],
        },
        logo: {
          type: "Image",
          props: {
            src: `${staticUrl}/vercel-logo.png`,
            width: 40,
            height: 37,
            alt: "Vercel",
            style: { margin: "0 auto", display: "block" },
          },
          children: [],
        },
        heading: {
          type: "Heading",
          props: {
            text: "Join Enigma on Vercel",
            as: "h1",
            style: {
              color: "#000000",
              fontSize: "24px",
              fontWeight: "normal",
              textAlign: "center",
              margin: "30px 0",
              padding: "0",
            },
          },
          children: [],
        },
        "greeting-text": {
          type: "Text",
          props: {
            text: "Hello alanturing,",
            style: {
              color: "#000000",
              fontSize: "14px",
              lineHeight: "24px",
            },
          },
          children: [],
        },
        "invite-text": {
          type: "Text",
          props: {
            text: "Alan (alan.turing@example.com) has invited you to the Enigma team on Vercel.",
            style: {
              color: "#000000",
              fontSize: "14px",
              lineHeight: "24px",
            },
          },
          children: [],
        },
        "avatar-section": {
          type: "Section",
          props: { style: {} },
          children: ["avatar-row"],
        },
        "avatar-row": {
          type: "Row",
          props: { style: {} },
          children: ["user-avatar-col", "arrow-col", "team-avatar-col"],
        },
        "user-avatar-col": {
          type: "Column",
          props: { style: {} },
          children: ["user-avatar"],
        },
        "user-avatar": {
          type: "Image",
          props: {
            src: `${staticUrl}/vercel-user.png`,
            width: 64,
            height: 64,
            alt: "alanturing",
            style: { borderRadius: "50%", marginLeft: "auto" },
          },
          children: [],
        },
        "arrow-col": {
          type: "Column",
          props: { style: {} },
          children: ["arrow-img"],
        },
        "arrow-img": {
          type: "Image",
          props: {
            src: `${staticUrl}/vercel-arrow.png`,
            width: 12,
            height: 9,
            alt: "invited to",
            style: { margin: "0 auto" },
          },
          children: [],
        },
        "team-avatar-col": {
          type: "Column",
          props: { style: {} },
          children: ["team-avatar"],
        },
        "team-avatar": {
          type: "Image",
          props: {
            src: `${staticUrl}/vercel-team.png`,
            width: 64,
            height: 64,
            alt: "Enigma",
            style: { borderRadius: "50%", marginRight: "auto" },
          },
          children: [],
        },
        "button-section": {
          type: "Section",
          props: {
            style: {
              marginTop: "32px",
              marginBottom: "32px",
              textAlign: "center",
            },
          },
          children: ["join-button"],
        },
        "join-button": {
          type: "Button",
          props: {
            text: "Join the team",
            href: "https://vercel.com/teams/invite/foo",
            style: {
              backgroundColor: "#000000",
              borderRadius: "4px",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "600",
              textDecoration: "none",
              textAlign: "center",
              padding: "12px 20px",
            },
          },
          children: [],
        },
        "url-text": {
          type: "Text",
          props: {
            text: "or copy and paste this URL into your browser:",
            style: {
              color: "#000000",
              fontSize: "14px",
              lineHeight: "24px",
            },
          },
          children: [],
        },
        "invite-link": {
          type: "Link",
          props: {
            text: "https://vercel.com/teams/invite/foo",
            href: "https://vercel.com/teams/invite/foo",
            style: {
              color: "#2563eb",
              textDecoration: "none",
              fontSize: "14px",
            },
          },
          children: [],
        },
        hr: {
          type: "Hr",
          props: { style: { borderColor: "#eaeaea", margin: "26px 0" } },
          children: [],
        },
        "footer-text": {
          type: "Text",
          props: {
            text: "This invitation was intended for alanturing. This invite was sent from 204.13.186.218 located in São Paulo, Brazil. If you were not expecting this invitation, you can ignore this email. If you are concerned about your account's safety, please reply to this email to get in touch with us.",
            style: {
              color: "#666666",
              fontSize: "12px",
              lineHeight: "24px",
            },
          },
          children: [],
        },
      },
    },
  },
  {
    name: "stripe-welcome",
    label: "Stripe Welcome",
    description: "Onboarding email with dashboard CTA",
    spec: {
      root: "html",
      elements: {
        html: {
          type: "Html",
          props: { lang: "en", dir: null },
          children: ["head", "preview", "body"],
        },
        head: {
          type: "Head",
          props: {},
          children: [],
        },
        preview: {
          type: "Preview",
          props: {
            text: "You're now ready to make live transactions with Stripe!",
          },
          children: [],
        },
        body: {
          type: "Body",
          props: {
            style: {
              backgroundColor: "#f6f9fc",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
            },
          },
          children: ["container"],
        },
        container: {
          type: "Container",
          props: {
            style: {
              backgroundColor: "#ffffff",
              margin: "0 auto",
              padding: "20px 0 48px",
              marginBottom: "64px",
            },
          },
          children: ["content-section"],
        },
        "content-section": {
          type: "Section",
          props: { style: { padding: "0 48px" } },
          children: [
            "logo",
            "hr1",
            "text-intro",
            "text-dashboard",
            "cta-button",
            "hr2",
            "text-docs",
            "docs-link",
            "text-api-keys",
            "text-checklist",
            "text-support",
            "text-signoff",
            "hr3",
            "footer-text",
          ],
        },
        logo: {
          type: "Image",
          props: {
            src: `${staticUrl}/stripe-logo.png`,
            width: 49,
            height: 21,
            alt: "Stripe",
            style: null,
          },
          children: [],
        },
        hr1: {
          type: "Hr",
          props: { style: { borderColor: "#e6ebf1", margin: "20px 0" } },
          children: [],
        },
        "text-intro": {
          type: "Text",
          props: {
            text: "Thanks for submitting your account information. You're now ready to make live transactions with Stripe!",
            style: {
              color: "#525f7f",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: "left",
            },
          },
          children: [],
        },
        "text-dashboard": {
          type: "Text",
          props: {
            text: "You can view your payments and a variety of other information about your account right from your dashboard.",
            style: {
              color: "#525f7f",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: "left",
            },
          },
          children: [],
        },
        "cta-button": {
          type: "Button",
          props: {
            text: "View your Stripe Dashboard",
            href: "https://dashboard.stripe.com/login",
            style: {
              backgroundColor: "#656ee8",
              borderRadius: "3px",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "bold",
              textDecoration: "none",
              textAlign: "center",
              display: "block",
              padding: "10px",
            },
          },
          children: [],
        },
        hr2: {
          type: "Hr",
          props: { style: { borderColor: "#e6ebf1", margin: "20px 0" } },
          children: [],
        },
        "text-docs": {
          type: "Text",
          props: {
            text: "If you haven't finished your integration, you might find our docs handy.",
            style: {
              color: "#525f7f",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: "left",
            },
          },
          children: [],
        },
        "docs-link": {
          type: "Link",
          props: {
            text: "Stripe Documentation — Getting Started",
            href: "https://docs.stripe.com/dashboard/basics",
            style: {
              color: "#556cd6",
              fontSize: "16px",
            },
          },
          children: [],
        },
        "text-api-keys": {
          type: "Text",
          props: {
            text: "Once you're ready to start accepting payments, you'll just need to use your live API keys instead of your test API keys. Your account can simultaneously be used for both test and live requests, so you can continue testing while accepting live payments. Check out our tutorial about account basics.",
            style: {
              color: "#525f7f",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: "left",
            },
          },
          children: [],
        },
        "text-checklist": {
          type: "Text",
          props: {
            text: "Finally, we've put together a quick checklist to ensure your website conforms to card network standards.",
            style: {
              color: "#525f7f",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: "left",
            },
          },
          children: [],
        },
        "text-support": {
          type: "Text",
          props: {
            text: "We'll be here to help you with any step along the way. You can find answers to most questions and get in touch with us on our support site.",
            style: {
              color: "#525f7f",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: "left",
            },
          },
          children: [],
        },
        "text-signoff": {
          type: "Text",
          props: {
            text: "— The Stripe team",
            style: {
              color: "#525f7f",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: "left",
            },
          },
          children: [],
        },
        hr3: {
          type: "Hr",
          props: { style: { borderColor: "#e6ebf1", margin: "20px 0" } },
          children: [],
        },
        "footer-text": {
          type: "Text",
          props: {
            text: "Stripe, 354 Oyster Point Blvd, South San Francisco, CA 94080",
            style: {
              color: "#8898aa",
              fontSize: "12px",
              lineHeight: "16px",
            },
          },
          children: [],
        },
      },
    },
  },
  {
    name: "nike-receipt",
    label: "Nike Receipt",
    description: "Order shipment notification with product details",
    spec: {
      root: "html",
      elements: {
        html: {
          type: "Html",
          props: { lang: "en", dir: null },
          children: ["head", "preview", "body"],
        },
        head: {
          type: "Head",
          props: {},
          children: [],
        },
        preview: {
          type: "Preview",
          props: {
            text: "Get your order summary, estimated delivery date and more",
          },
          children: [],
        },
        body: {
          type: "Body",
          props: {
            style: {
              backgroundColor: "#ffffff",
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            },
          },
          children: ["container"],
        },
        container: {
          type: "Container",
          props: {
            style: {
              margin: "10px auto",
              width: "600px",
              maxWidth: "100%",
              border: "1px solid #E5E5E5",
            },
          },
          children: [
            "tracking-section",
            "hr1",
            "hero-section",
            "hr2",
            "shipping-section",
            "hr3",
            "product-section",
            "hr4",
            "order-info-section",
            "hr5",
            "footer-section",
          ],
        },

        // ── Tracking Section ──
        "tracking-section": {
          type: "Section",
          props: {
            style: {
              padding: "22px 40px",
              backgroundColor: "#F7F7F7",
            },
          },
          children: ["tracking-row"],
        },
        "tracking-row": {
          type: "Row",
          props: { style: {} },
          children: ["tracking-info-col", "tracking-btn-col"],
        },
        "tracking-info-col": {
          type: "Column",
          props: { style: {} },
          children: ["tracking-label", "tracking-number"],
        },
        "tracking-label": {
          type: "Text",
          props: {
            text: "Tracking Number",
            style: {
              margin: "0",
              fontSize: "14px",
              lineHeight: "2",
              fontWeight: "bold",
            },
          },
          children: [],
        },
        "tracking-number": {
          type: "Text",
          props: {
            text: "1ZV218970300071628",
            style: {
              margin: "12px 0 0",
              fontSize: "14px",
              lineHeight: "1.4",
              fontWeight: "500",
              color: "#6F6F6F",
            },
          },
          children: [],
        },
        "tracking-btn-col": {
          type: "Column",
          props: { style: { textAlign: "right" } },
          children: ["tracking-link"],
        },
        "tracking-link": {
          type: "Link",
          props: {
            text: "Track Package",
            href: "https://www.nike.com/orders",
            style: {
              border: "1px solid #929292",
              fontSize: "16px",
              textDecoration: "none",
              padding: "10px 0",
              width: "220px",
              display: "block",
              textAlign: "center",
              fontWeight: "500",
              color: "#000000",
            },
          },
          children: [],
        },
        hr1: {
          type: "Hr",
          props: { style: { borderColor: "#E5E5E5", margin: "0" } },
          children: [],
        },

        // ── Hero Section ──
        "hero-section": {
          type: "Section",
          props: {
            style: {
              padding: "40px 74px",
              textAlign: "center",
            },
          },
          children: [
            "nike-logo",
            "hero-heading",
            "hero-text",
            "hero-text-payment",
          ],
        },
        "nike-logo": {
          type: "Image",
          props: {
            src: `${staticUrl}/nike-logo.png`,
            width: 66,
            height: 22,
            alt: "Nike",
            style: { margin: "0 auto", display: "block" },
          },
          children: [],
        },
        "hero-heading": {
          type: "Heading",
          props: {
            text: "It's On Its Way.",
            as: "h1",
            style: {
              fontSize: "32px",
              lineHeight: "1.3",
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: "-1px",
            },
          },
          children: [],
        },
        "hero-text": {
          type: "Text",
          props: {
            text: "Your order is on its way. Use the link above to track its progress.",
            style: {
              margin: "0",
              fontSize: "14px",
              lineHeight: "2",
              color: "#747474",
              fontWeight: "500",
            },
          },
          children: [],
        },
        "hero-text-payment": {
          type: "Text",
          props: {
            text: "We've also charged your payment method for the cost of your order and will be removing any authorization holds. For payment details, please visit your Orders page on Nike.com or in the Nike app.",
            style: {
              margin: "24px 0 0",
              fontSize: "14px",
              lineHeight: "2",
              color: "#747474",
              fontWeight: "500",
            },
          },
          children: [],
        },
        hr2: {
          type: "Hr",
          props: { style: { borderColor: "#E5E5E5", margin: "0" } },
          children: [],
        },

        // ── Shipping Section ──
        "shipping-section": {
          type: "Section",
          props: { style: { padding: "22px 40px" } },
          children: ["shipping-label", "shipping-address"],
        },
        "shipping-label": {
          type: "Text",
          props: {
            text: "Shipping to: Alan Turing",
            style: {
              margin: "0",
              fontSize: "15px",
              lineHeight: "2",
              fontWeight: "bold",
            },
          },
          children: [],
        },
        "shipping-address": {
          type: "Text",
          props: {
            text: "2125 Chestnut St, San Francisco, CA 94123",
            style: {
              margin: "0",
              fontSize: "14px",
              lineHeight: "2",
              color: "#747474",
              fontWeight: "500",
            },
          },
          children: [],
        },
        hr3: {
          type: "Hr",
          props: { style: { borderColor: "#E5E5E5", margin: "0" } },
          children: [],
        },

        // ── Product Section ──
        "product-section": {
          type: "Section",
          props: { style: { padding: "40px" } },
          children: ["product-row"],
        },
        "product-row": {
          type: "Row",
          props: { style: {} },
          children: ["product-img-col", "product-details-col"],
        },
        "product-img-col": {
          type: "Column",
          props: { style: {} },
          children: ["product-img"],
        },
        "product-img": {
          type: "Image",
          props: {
            src: `${staticUrl}/nike-product.png`,
            alt: "Brazil 2022/23 Stadium Away Women's Nike Dri-FIT Soccer Jersey",
            width: 260,
            height: null,
            style: { float: "left" },
          },
          children: [],
        },
        "product-details-col": {
          type: "Column",
          props: {
            style: { verticalAlign: "top", paddingLeft: "12px" },
          },
          children: ["product-name", "product-size"],
        },
        "product-name": {
          type: "Text",
          props: {
            text: "Brazil 2022/23 Stadium Away Women's Nike Dri-FIT Soccer Jersey",
            style: {
              margin: "0",
              fontSize: "14px",
              lineHeight: "2",
              fontWeight: "500",
            },
          },
          children: [],
        },
        "product-size": {
          type: "Text",
          props: {
            text: "Size L (12–14)",
            style: {
              margin: "0",
              fontSize: "14px",
              lineHeight: "2",
              color: "#747474",
              fontWeight: "500",
            },
          },
          children: [],
        },
        hr4: {
          type: "Hr",
          props: { style: { borderColor: "#E5E5E5", margin: "0" } },
          children: [],
        },

        // ── Order Info Section ──
        "order-info-section": {
          type: "Section",
          props: { style: { padding: "22px 40px" } },
          children: ["order-meta-row", "order-status-row"],
        },
        "order-meta-row": {
          type: "Row",
          props: { style: { marginBottom: "40px" } },
          children: ["order-number-col", "order-date-col"],
        },
        "order-number-col": {
          type: "Column",
          props: { style: { width: "170px" } },
          children: ["order-number-label", "order-number-value"],
        },
        "order-number-label": {
          type: "Text",
          props: {
            text: "Order Number",
            style: {
              margin: "0",
              fontSize: "14px",
              lineHeight: "2",
              fontWeight: "bold",
            },
          },
          children: [],
        },
        "order-number-value": {
          type: "Text",
          props: {
            text: "C0106373851",
            style: {
              margin: "12px 0 0",
              fontSize: "14px",
              lineHeight: "1.4",
              fontWeight: "500",
              color: "#6F6F6F",
            },
          },
          children: [],
        },
        "order-date-col": {
          type: "Column",
          props: { style: {} },
          children: ["order-date-label", "order-date-value"],
        },
        "order-date-label": {
          type: "Text",
          props: {
            text: "Order Date",
            style: {
              margin: "0",
              fontSize: "14px",
              lineHeight: "2",
              fontWeight: "bold",
            },
          },
          children: [],
        },
        "order-date-value": {
          type: "Text",
          props: {
            text: "Sep 22, 2022",
            style: {
              margin: "12px 0 0",
              fontSize: "14px",
              lineHeight: "1.4",
              fontWeight: "500",
              color: "#6F6F6F",
            },
          },
          children: [],
        },
        "order-status-row": {
          type: "Row",
          props: { style: {} },
          children: ["order-status-col"],
        },
        "order-status-col": {
          type: "Column",
          props: { style: { textAlign: "center" } },
          children: ["order-status-link"],
        },
        "order-status-link": {
          type: "Link",
          props: {
            text: "Order Status",
            href: "https://www.nike.com/orders",
            style: {
              border: "1px solid #929292",
              fontSize: "16px",
              textDecoration: "none",
              padding: "10px 0",
              width: "220px",
              display: "block",
              textAlign: "center",
              fontWeight: "500",
              color: "#000000",
              margin: "0 auto",
            },
          },
          children: [],
        },
        hr5: {
          type: "Hr",
          props: { style: { borderColor: "#E5E5E5", margin: "0" } },
          children: [],
        },

        // ── Footer Section ──
        "footer-section": {
          type: "Section",
          props: { style: { padding: "22px 0", textAlign: "center" } },
          children: [
            "footer-brand",
            "footer-nav-row",
            "footer-contact",
            "footer-copyright",
            "footer-address",
          ],
        },
        "footer-brand": {
          type: "Text",
          props: {
            text: "Nike.com",
            style: {
              fontSize: "32px",
              lineHeight: "1.3",
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: "-1px",
            },
          },
          children: [],
        },
        "footer-nav-row": {
          type: "Row",
          props: { style: { width: "370px", margin: "0 auto" } },
          children: [
            "footer-nav-men",
            "footer-nav-women",
            "footer-nav-kids",
            "footer-nav-customize",
          ],
        },
        "footer-nav-men": {
          type: "Column",
          props: { style: { textAlign: "center" } },
          children: ["link-men"],
        },
        "link-men": {
          type: "Link",
          props: {
            text: "Men",
            href: "https://www.nike.com/",
            style: { fontWeight: "500", color: "#000000" },
          },
          children: [],
        },
        "footer-nav-women": {
          type: "Column",
          props: { style: { textAlign: "center" } },
          children: ["link-women"],
        },
        "link-women": {
          type: "Link",
          props: {
            text: "Women",
            href: "https://www.nike.com/",
            style: { fontWeight: "500", color: "#000000" },
          },
          children: [],
        },
        "footer-nav-kids": {
          type: "Column",
          props: { style: { textAlign: "center" } },
          children: ["link-kids"],
        },
        "link-kids": {
          type: "Link",
          props: {
            text: "Kids",
            href: "https://www.nike.com/",
            style: { fontWeight: "500", color: "#000000" },
          },
          children: [],
        },
        "footer-nav-customize": {
          type: "Column",
          props: { style: { textAlign: "center" } },
          children: ["link-customize"],
        },
        "link-customize": {
          type: "Link",
          props: {
            text: "Customize",
            href: "https://www.nike.com/",
            style: { fontWeight: "500", color: "#000000" },
          },
          children: [],
        },
        "footer-contact": {
          type: "Text",
          props: {
            text: "Please contact us if you have any questions. (If you reply to this email, we won't be able to see it.)",
            style: {
              margin: "0",
              color: "#AFAFAF",
              fontSize: "13px",
              textAlign: "center",
              padding: "30px 0",
            },
          },
          children: [],
        },
        "footer-copyright": {
          type: "Text",
          props: {
            text: "© 2022 Nike, Inc. All Rights Reserved.",
            style: {
              margin: "0",
              color: "#AFAFAF",
              fontSize: "13px",
              textAlign: "center",
            },
          },
          children: [],
        },
        "footer-address": {
          type: "Text",
          props: {
            text: "NIKE, INC. One Bowerman Drive, Beaverton, Oregon 97005, USA.",
            style: {
              margin: "0",
              color: "#AFAFAF",
              fontSize: "13px",
              textAlign: "center",
            },
          },
          children: [],
        },
      },
    },
  },
];

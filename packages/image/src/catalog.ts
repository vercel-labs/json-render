import { z } from "zod";

/**
 * Standard component definitions for image catalogs.
 *
 * These define the available image components with their Zod prop schemas.
 * All components render to Satori-compatible JSX (HTML-like elements with
 * inline CSS flexbox styles).
 */
export const standardComponentDefinitions = {
  // ==========================================================================
  // Root
  // ==========================================================================

  Frame: {
    props: z.object({
      width: z.number(),
      height: z.number(),
      backgroundColor: z.string().nullable(),
      padding: z.number().nullable(),
      display: z.enum(["flex", "none"]).nullable(),
      flexDirection: z.enum(["row", "column"]).nullable(),
      alignItems: z
        .enum(["flex-start", "center", "flex-end", "stretch"])
        .nullable(),
      justifyContent: z
        .enum([
          "flex-start",
          "center",
          "flex-end",
          "space-between",
          "space-around",
        ])
        .nullable(),
    }),
    slots: ["default"],
    description:
      "Root image container. Defines the output image dimensions and background. Must be the root element.",
    example: { width: 1200, height: 630, backgroundColor: "#ffffff" },
  },

  // ==========================================================================
  // Layout Components
  // ==========================================================================

  Box: {
    props: z.object({
      padding: z.number().nullable(),
      paddingTop: z.number().nullable(),
      paddingBottom: z.number().nullable(),
      paddingLeft: z.number().nullable(),
      paddingRight: z.number().nullable(),
      margin: z.number().nullable(),
      backgroundColor: z.string().nullable(),
      borderWidth: z.number().nullable(),
      borderColor: z.string().nullable(),
      borderRadius: z.number().nullable(),
      flex: z.number().nullable(),
      width: z.union([z.number(), z.string()]).nullable(),
      height: z.union([z.number(), z.string()]).nullable(),
      alignItems: z
        .enum(["flex-start", "center", "flex-end", "stretch"])
        .nullable(),
      justifyContent: z
        .enum([
          "flex-start",
          "center",
          "flex-end",
          "space-between",
          "space-around",
        ])
        .nullable(),
      flexDirection: z.enum(["row", "column"]).nullable(),
      position: z.enum(["relative", "absolute"]).nullable(),
      top: z.number().nullable(),
      left: z.number().nullable(),
      right: z.number().nullable(),
      bottom: z.number().nullable(),
      overflow: z.enum(["visible", "hidden"]).nullable(),
    }),
    slots: ["default"],
    description:
      "Generic container with padding, margin, background, border, and flex alignment. Supports absolute positioning.",
    example: {
      padding: 20,
      backgroundColor: "#f9f9f9",
      borderRadius: 8,
      alignItems: "center",
    },
  },

  Row: {
    props: z.object({
      gap: z.number().nullable(),
      alignItems: z
        .enum(["flex-start", "center", "flex-end", "stretch"])
        .nullable(),
      justifyContent: z
        .enum([
          "flex-start",
          "center",
          "flex-end",
          "space-between",
          "space-around",
        ])
        .nullable(),
      padding: z.number().nullable(),
      flex: z.number().nullable(),
      wrap: z.boolean().nullable(),
    }),
    slots: ["default"],
    description:
      "Horizontal flex layout. Use for placing elements side by side.",
    example: { gap: 10, alignItems: "center" },
  },

  Column: {
    props: z.object({
      gap: z.number().nullable(),
      alignItems: z
        .enum(["flex-start", "center", "flex-end", "stretch"])
        .nullable(),
      justifyContent: z
        .enum([
          "flex-start",
          "center",
          "flex-end",
          "space-between",
          "space-around",
        ])
        .nullable(),
      padding: z.number().nullable(),
      flex: z.number().nullable(),
    }),
    slots: ["default"],
    description:
      "Vertical flex layout. Use for stacking elements top to bottom.",
    example: { gap: 8, padding: 10 },
  },

  // ==========================================================================
  // Content Components
  // ==========================================================================

  Heading: {
    props: z.object({
      text: z.string(),
      level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
      color: z.string().nullable(),
      align: z.enum(["left", "center", "right"]).nullable(),
      letterSpacing: z.union([z.number(), z.string()]).nullable(),
      lineHeight: z.number().nullable(),
    }),
    slots: [],
    description:
      "Heading text at various levels. h1 is largest, h4 is smallest.",
    example: { text: "Hello World", level: "h1", color: "#000000" },
  },

  Text: {
    props: z.object({
      text: z.string(),
      fontSize: z.number().nullable(),
      color: z.string().nullable(),
      align: z.enum(["left", "center", "right"]).nullable(),
      fontWeight: z.enum(["normal", "bold"]).nullable(),
      fontStyle: z.enum(["normal", "italic"]).nullable(),
      lineHeight: z.number().nullable(),
      letterSpacing: z.union([z.number(), z.string()]).nullable(),
      textDecoration: z.enum(["none", "underline", "line-through"]).nullable(),
    }),
    slots: [],
    description:
      "Body text with configurable size, color, weight, and alignment.",
    example: { text: "Some content here.", fontSize: 16, color: "#333333" },
  },

  Image: {
    props: z.object({
      src: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      borderRadius: z.number().nullable(),
      objectFit: z.enum(["contain", "cover", "fill", "none"]).nullable(),
    }),
    slots: [],
    description:
      "Image from a URL. Specify width and/or height to control size. For placeholder images use https://picsum.photos/{width}/{height}?random={n}.",
    example: {
      src: "https://picsum.photos/400/300?random=1",
      width: 400,
      height: 300,
    },
  },

  // ==========================================================================
  // Decorative Components
  // ==========================================================================

  Divider: {
    props: z.object({
      color: z.string().nullable(),
      thickness: z.number().nullable(),
      marginTop: z.number().nullable(),
      marginBottom: z.number().nullable(),
    }),
    slots: [],
    description: "Horizontal line separator between content sections.",
    example: { color: "#e5e7eb", thickness: 1 },
  },

  Spacer: {
    props: z.object({
      height: z.number().nullable(),
    }),
    slots: [],
    description: "Empty vertical space between elements.",
    example: { height: 20 },
  },
};

export type StandardComponentDefinitions = typeof standardComponentDefinitions;

export type StandardComponentProps<
  K extends keyof StandardComponentDefinitions,
> = StandardComponentDefinitions[K]["props"] extends { _output: infer O }
  ? O
  : z.output<StandardComponentDefinitions[K]["props"]>;

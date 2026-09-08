import { z } from "zod";

/**
 * Server-safe catalog definitions for components built into PageRenderer.
 * Include these in every TanStack Start catalog that generates layouts or links.
 */
export const startComponentDefinitions = {
  Slot: {
    props: z.object({}),
    slots: ["default"],
    description:
      "Layout placeholder where the matched route's page content is rendered.",
    example: {},
  },
  Link: {
    props: z.object({
      href: z.string(),
      replace: z.boolean().optional(),
      prefetch: z.boolean().optional(),
      className: z.string().optional(),
      style: z.record(z.string(), z.unknown()).optional(),
    }),
    slots: ["default"],
    description: "Client-side link to another route in the application.",
    example: { href: "/about" },
  },
};

export type StartComponentDefinitions = typeof startComponentDefinitions;

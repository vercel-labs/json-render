import { z } from "zod";

/**
 * Shared catalog definition — imported by both vue/catalog.ts and react/catalog.ts.
 * Each renderer calls schema.createCatalog(catalogDef) with its own schema instance.
 */
export const catalogDef = {
  components: {
    Stack: {
      props: z.object({
        gap: z.number().optional(),
        padding: z.number().optional(),
        direction: z.enum(["vertical", "horizontal"]).optional(),
        align: z.enum(["start", "center", "end"]).optional(),
      }),
      slots: ["default"],
      description:
        "Layout container that stacks children vertically or horizontally",
    },
    Card: {
      props: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
      }),
      slots: ["default"],
      description: "A card container with optional title and subtitle",
    },
    Text: {
      props: z.object({
        content: z.string(),
        size: z.enum(["sm", "md", "lg", "xl"]).optional(),
        weight: z.enum(["normal", "medium", "bold"]).optional(),
        color: z.string().optional(),
      }),
      slots: [],
      description: "Displays a text string",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).optional(),
        disabled: z.boolean().optional(),
      }),
      slots: [],
      description: "A clickable button that emits a 'press' event",
    },
    Badge: {
      props: z.object({
        label: z.string(),
        color: z.string().optional(),
      }),
      slots: [],
      description: "A small badge/tag label",
    },
    ListItem: {
      props: z.object({
        title: z.string(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
      }),
      slots: [],
      description: "A single item in a list",
    },
    RendererTabs: {
      props: z.object({ renderer: z.string() }),
      slots: [],
      description:
        "Segmented tab control for switching between Vue and React renderers",
    },
    RendererBadge: {
      props: z.object({ renderer: z.string() }),
      slots: [],
      description: "Badge indicating which renderer is currently active",
    },
  },
  actions: {
    increment: {
      params: z.object({}),
      description: "Increment the counter by 1",
    },
    decrement: {
      params: z.object({}),
      description: "Decrement the counter by 1",
    },
    reset: { params: z.object({}), description: "Reset the counter to 0" },
    toggleItem: {
      params: z.object({ index: z.number() }),
      description: "Toggle the completed state of a todo item",
    },
    switchToVue: {
      params: z.object({}),
      description: "Switch to the Vue renderer",
    },
    switchToReact: {
      params: z.object({}),
      description: "Switch to the React renderer",
    },
  },
};

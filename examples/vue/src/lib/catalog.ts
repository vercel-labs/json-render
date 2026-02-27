import { schema } from "@json-render/vue/schema";
import { z } from "zod";

export const catalog = schema.createCatalog({
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
    Input: {
      props: z.object({
        value: z.string().optional(),
        placeholder: z.string().optional(),
      }),
      slots: [],
      description: "A text input field that supports two-way state binding",
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
    reset: {
      params: z.object({}),
      description: "Reset the counter to 0",
    },
    toggleItem: {
      params: z.object({
        index: z.number(),
      }),
      description: "Toggle the completed state of a todo item",
    },
  },
});

export type AppCatalog = typeof catalog;

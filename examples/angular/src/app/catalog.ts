import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/angular";
import { z } from "zod";

/**
 * Catalog exercising every feature:
 * - Components with various prop types
 * - Actions (custom + built-in setState/pushState/removeState/validateForm)
 * - Validation checks
 */
export const catalog = defineCatalog(schema, {
  components: {
    Stack: {
      props: z.object({
        gap: z.number().optional(),
        padding: z.number().optional(),
        direction: z.enum(["vertical", "horizontal"]).optional(),
        align: z.enum(["start", "center", "end"]).optional(),
      }),
      slots: ["default"],
      description: "Layout container",
    },
    Card: {
      props: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
      }),
      slots: ["default"],
      description: "Card container with title",
    },
    Text: {
      props: z.object({
        content: z.string(),
        size: z.enum(["sm", "md", "lg", "xl"]).optional(),
        weight: z.enum(["normal", "medium", "bold"]).optional(),
        color: z.string().optional(),
      }),
      slots: [],
      description: "Displays text",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).optional(),
        disabled: z.boolean().optional(),
      }),
      slots: [],
      description: "Clickable button with press event",
    },
    Badge: {
      props: z.object({
        label: z.string(),
        color: z.string().optional(),
      }),
      slots: [],
      description: "Small badge/tag",
    },
    ListItem: {
      props: z.object({
        title: z.string(),
        completed: z.boolean().optional(),
      }),
      slots: [],
      description: "List item with toggle",
    },
    Input: {
      props: z.object({
        value: z.string().optional(),
        placeholder: z.string().optional(),
        checks: z.array(z.any()).optional(),
        validateOn: z.enum(["change", "blur", "submit"]).optional(),
      }),
      slots: [],
      description: "Text input with two-way binding and validation",
    },
  },
  actions: {
    increment: {
      params: z.object({}),
      description: "Increment counter",
    },
    decrement: {
      params: z.object({}),
      description: "Decrement counter",
    },
    toggleItem: {
      params: z.object({ index: z.number() }),
      description: "Toggle todo completed",
    },
    deleteConfirmed: {
      params: z.object({}),
      description: "Action that requires confirmation dialog",
    },
  },
});

import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/astro";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Section: {
      props: z.object({
        id: z.string().nullable(),
        className: z.string().nullable(),
      }),
      description: "A semantic section wrapper",
    },
    Card: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
      }),
      description: "A card container with title and optional subtitle",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
      }),
      description: "Heading text at various levels",
    },
    Text: {
      props: z.object({
        content: z.string(),
      }),
      description: "Body text paragraph",
    },
    Badge: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["default", "success", "warning"]).nullable(),
      }),
      description: "A small status badge",
    },
    List: {
      props: z.object({}),
      description: "An unordered list container",
    },
    ListItem: {
      props: z.object({
        text: z.string(),
      }),
      description: "A single list item",
    },
    Link: {
      props: z.object({
        href: z.string(),
        text: z.string(),
      }),
      description: "A hyperlink",
    },
  },
});

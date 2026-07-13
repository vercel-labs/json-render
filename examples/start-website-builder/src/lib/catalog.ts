import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/start/server";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { websiteComponentDefinitions } from "./website-catalog";

export const catalog = defineCatalog(schema, {
  components: {
    ...shadcnComponentDefinitions,
    ...websiteComponentDefinitions,
  },
  actions: {},
});

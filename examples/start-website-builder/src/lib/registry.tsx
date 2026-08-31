import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "./catalog";
import { websiteComponents } from "./website-components";

export const { registry } = defineRegistry(catalog, {
  components: {
    ...shadcnComponents,
    ...websiteComponents,
  },
  actions: {},
});

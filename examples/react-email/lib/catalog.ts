import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react-email/server";
import { standardComponentDefinitions } from "@json-render/react-email/catalog";

export const emailCatalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  actions: {},
});

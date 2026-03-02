import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/image/server";
import { standardComponentDefinitions } from "@json-render/image/catalog";

export const imageCatalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});

import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react-email/server";
import { standardComponentDefinitions } from "@json-render/react-email/catalog";

/**
 * Email-only playground catalog
 *
 * Uses the React Email schema and standard component definitions.
 */
export const playgroundCatalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  actions: {},
});

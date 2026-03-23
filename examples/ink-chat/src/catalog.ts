import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/ink/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/ink/catalog";

export const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  actions: standardActionDefinitions,
});

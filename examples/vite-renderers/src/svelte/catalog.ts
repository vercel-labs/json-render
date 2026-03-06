import { schema } from "@json-render/svelte/schema";
import { catalogDef } from "../shared/catalog-def";

export const catalog = schema.createCatalog(catalogDef);

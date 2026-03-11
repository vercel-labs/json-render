import { schema } from "@json-render/solid/schema";
import { catalogDef } from "../shared/catalog-def";

export const catalog = schema.createCatalog(catalogDef);
export type AppCatalog = typeof catalog;

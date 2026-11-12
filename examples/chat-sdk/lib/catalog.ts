import { defineCatalog } from "@json-render/core";
import { schema, standardComponentDefinitions } from "@json-render/chat";

export const chatCatalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});

/** Slack caps a message at one table and two charts. */
export const slackLimits = {
  tables: 1,
  charts: 2,
  chartLabel: 20,
  chartTitle: 50,
};

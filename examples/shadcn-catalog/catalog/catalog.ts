import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { metricProps, trackMetricAction } from "./custom";

export const catalog = defineCatalog(schema, {
  components: {
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Text: shadcnComponentDefinitions.Text,
    Badge: shadcnComponentDefinitions.Badge,
    Alert: shadcnComponentDefinitions.Alert,
    Button: shadcnComponentDefinitions.Button,
    Metric: {
      props: metricProps,
      description:
        "KPI metric display. Custom extension, not part of the shadcn set.",
    },
  },
  actions: {
    trackMetric: trackMetricAction,
  },
});

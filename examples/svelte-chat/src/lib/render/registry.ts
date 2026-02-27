import { defineRegistry, type ComponentRegistry } from "@json-render/svelte";
import { shadcnComponents } from "@json-render/shadcn-svelte";
import { explorerCatalog } from "./catalog";

import TextComponent from "./components/Text.svelte";
import AlertComponent from "./components/Alert.svelte";
import MetricComponent from "./components/Metric.svelte";
import TableComponent from "./components/Table.svelte";
import LinkComponent from "./components/Link.svelte";
import BarChartComponent from "./components/BarChart.svelte";
import LineChartComponent from "./components/LineChart.svelte";
import TabContentComponent from "./components/TabContent.svelte";
import CalloutComponent from "./components/Callout.svelte";
import TimelineComponent from "./components/Timeline.svelte";
import PieChartComponent from "./components/PieChart.svelte";
import RadioGroupComponent from "./components/RadioGroup.svelte";
import SelectInputComponent from "./components/SelectInput.svelte";
import TextInputComponent from "./components/TextInput.svelte";

const components: ComponentRegistry = {
  Stack: shadcnComponents.Stack,
  Card: shadcnComponents.Card,
  Grid: shadcnComponents.Grid,
  Heading: shadcnComponents.Heading,
  Text: TextComponent,
  Badge: shadcnComponents.Badge,
  Alert: AlertComponent,
  Separator: shadcnComponents.Separator,
  Metric: MetricComponent,
  Table: TableComponent,
  Link: LinkComponent,
  BarChart: BarChartComponent,
  LineChart: LineChartComponent,
  Tabs: shadcnComponents.Tabs,
  TabContent: TabContentComponent,
  Progress: shadcnComponents.Progress,
  Skeleton: shadcnComponents.Skeleton,
  Callout: CalloutComponent,
  Accordion: shadcnComponents.Accordion,
  Timeline: TimelineComponent,
  PieChart: PieChartComponent,
  RadioGroup: RadioGroupComponent,
  SelectInput: SelectInputComponent,
  TextInput: TextInputComponent,
  Button: shadcnComponents.Button,
};

export const { registry } = defineRegistry(explorerCatalog, {
  components,
});

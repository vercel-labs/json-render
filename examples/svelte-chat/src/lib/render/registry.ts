import { defineRegistry, type ComponentRegistry } from "@json-render/svelte";
import { explorerCatalog } from "./catalog";

// Import render components
import StackComponent from "./components/Stack.svelte";
import CardComponent from "./components/Card.svelte";
import GridComponent from "./components/Grid.svelte";
import HeadingComponent from "./components/Heading.svelte";
import TextComponent from "./components/Text.svelte";
import BadgeComponent from "./components/Badge.svelte";
import AlertComponent from "./components/Alert.svelte";
import SeparatorComponent from "./components/Separator.svelte";
import MetricComponent from "./components/Metric.svelte";
import TableComponent from "./components/Table.svelte";
import LinkComponent from "./components/Link.svelte";
import BarChartComponent from "./components/BarChart.svelte";
import LineChartComponent from "./components/LineChart.svelte";
import TabsComponent from "./components/Tabs.svelte";
import TabContentComponent from "./components/TabContent.svelte";
import ProgressComponent from "./components/Progress.svelte";
import SkeletonComponent from "./components/Skeleton.svelte";
import CalloutComponent from "./components/Callout.svelte";
import AccordionComponent from "./components/Accordion.svelte";
import TimelineComponent from "./components/Timeline.svelte";
import PieChartComponent from "./components/PieChart.svelte";
import RadioGroupComponent from "./components/RadioGroup.svelte";
import SelectInputComponent from "./components/SelectInput.svelte";
import TextInputComponent from "./components/TextInput.svelte";
import ButtonComponent from "./components/Button.svelte";

const components: ComponentRegistry = {
  Stack: StackComponent,
  Card: CardComponent,
  Grid: GridComponent,
  Heading: HeadingComponent,
  Text: TextComponent,
  Badge: BadgeComponent,
  Alert: AlertComponent,
  Separator: SeparatorComponent,
  Metric: MetricComponent,
  Table: TableComponent,
  Link: LinkComponent,
  BarChart: BarChartComponent,
  LineChart: LineChartComponent,
  Tabs: TabsComponent,
  TabContent: TabContentComponent,
  Progress: ProgressComponent,
  Skeleton: SkeletonComponent,
  Callout: CalloutComponent,
  Accordion: AccordionComponent,
  Timeline: TimelineComponent,
  PieChart: PieChartComponent,
  RadioGroup: RadioGroupComponent,
  SelectInput: SelectInputComponent,
  TextInput: TextInputComponent,
  Button: ButtonComponent,
};

export const { registry } = defineRegistry(explorerCatalog, {
  components,
});

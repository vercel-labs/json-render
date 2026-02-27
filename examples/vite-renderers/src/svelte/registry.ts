import { defineRegistry, type ComponentRegistry } from "@json-render/svelte";
import { catalog } from "./catalog";
import { actionStubs } from "../shared/handlers";

import Stack from "./components/Stack.svelte";
import Card from "./components/Card.svelte";
import Text from "./components/Text.svelte";
import Button from "./components/Button.svelte";
import Badge from "./components/Badge.svelte";
import ListItem from "./components/ListItem.svelte";
import RendererBadge from "./components/RendererBadge.svelte";
import RendererTabs from "./components/RendererTabs.svelte";

const components: ComponentRegistry = {
  Stack,
  Card,
  Text,
  Button,
  Badge,
  ListItem,
  RendererBadge,
  RendererTabs,
};

export const { registry } = defineRegistry(catalog, {
  components,
  actions: actionStubs,
});

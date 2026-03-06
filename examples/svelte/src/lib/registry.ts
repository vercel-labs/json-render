import { type Components, defineRegistry } from "@json-render/svelte";
import { catalog } from "./catalog";

import Stack from "./components/Stack.svelte";
import Card from "./components/Card.svelte";
import Text from "./components/Text.svelte";
import Button from "./components/Button.svelte";
import Badge from "./components/Badge.svelte";
import ListItem from "./components/ListItem.svelte";
import Input from "./components/Input.svelte";

const components: Components<typeof catalog> = {
  Stack,
  Card,
  Text,
  Button,
  Badge,
  ListItem,
  Input,
};

export const { registry } = defineRegistry(catalog, { components });

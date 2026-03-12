import { type Components, defineRegistry } from "@json-render/solid";
import { catalog } from "./catalog";
import { Stack } from "./components/Stack";
import { Card } from "./components/Card";
import { Text } from "./components/Text";
import { Button } from "./components/Button";
import { Badge } from "./components/Badge";
import { ListItem } from "./components/ListItem";
import { Input } from "./components/Input";

const components: Components<typeof catalog> = {
  Stack,
  Card,
  Text,
  Button,
  Badge,
  ListItem,
  Input,
};

export const { registry, handlers: makeHandlers } = defineRegistry(catalog, {
  components,
  actions: {
    increment: async () => {},
    decrement: async () => {},
    reset: async () => {},
    toggleItem: async () => {},
  },
});

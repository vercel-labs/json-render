<script setup lang="ts">
import {
  ActionProvider,
  ValidationProvider,
  VisibilityProvider,
  Renderer,
  defineRegistry,
  useStateStore,
} from "@json-render/vue";
import { catalog } from "./lib/catalog";
import { components } from "./lib/registry";
import { demoSpec } from "./lib/spec";

// Access the state store provided by the parent StateProvider
const { get, set } = useStateStore();

// Build registry — include stub actions to satisfy catalog types.
// The actual logic runs in the handlers below, which have direct
// access to the state store.
const { registry } = defineRegistry(catalog, {
  components,
  actions: {
    increment: async () => {},
    decrement: async () => {},
    reset: async () => {},
    toggleItem: async () => {},
  },
});

// Action handlers — close over the state store's get/set so they
// can read and write state directly without needing an external store.
const handlers = {
  increment: async () => {
    set("/count", Number(get("/count") || 0) + 1);
  },
  decrement: async () => {
    set("/count", Math.max(0, Number(get("/count") || 0) - 1));
  },
  reset: async () => {
    set("/count", 0);
  },
  toggleItem: async (params: Record<string, unknown>) => {
    const index = params.index as number;
    const todos = (
      get("/todos") as Array<{
        id: number;
        title: string;
        completed: boolean;
      }>
    ).slice();
    const item = todos[index];
    if (item) {
      todos[index] = { ...item, completed: !item.completed };
    }
    set("/todos", todos);
  },
};
</script>

<template>
  <ActionProvider :handlers="handlers">
    <VisibilityProvider>
      <ValidationProvider>
        <Renderer :spec="demoSpec" :registry="registry" />
      </ValidationProvider>
    </VisibilityProvider>
  </ActionProvider>
</template>

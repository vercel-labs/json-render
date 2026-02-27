<script setup lang="ts">
import type { Spec } from "@json-render/core";
import {
  ActionProvider, ValidationProvider, VisibilityProvider,
  Renderer, defineRegistry, useStateStore,
} from "@json-render/vue";
import { catalog } from "./catalog";
import { components } from "./registry";
import { actionStubs, makeHandlers } from "../shared/handlers";

const props = defineProps<{ spec: Spec }>();
const { get, set } = useStateStore();
const { registry } = defineRegistry(catalog, { components, actions: actionStubs });
const handlers = makeHandlers(get, set);
</script>

<template>
  <ActionProvider :handlers="handlers">
    <VisibilityProvider>
      <ValidationProvider>
        <Renderer :spec="props.spec" :registry="registry" />
      </ValidationProvider>
    </VisibilityProvider>
  </ActionProvider>
</template>

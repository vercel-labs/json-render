<script setup lang="ts">
import { StateProvider } from "@json-render/vue";
import { demoSpec } from "./lib/spec";
import DemoRenderer from "./DemoRenderer.vue";

const initialState = demoSpec.state ?? {};
</script>

<template>
  <!-- StateProvider sets up the reactive state store for the whole tree -->
  <StateProvider :initial-state="initialState">
    <DemoRenderer />
  </StateProvider>
</template>

<script setup lang="ts">
import { StateProvider } from "@json-render/uniapp";
import { demoSpec } from "../../lib/spec";
import DemoRenderer from "./DemoRenderer.vue";

const initialState = demoSpec.state ?? {};
</script>

<template>
    <view class="page">
        <!-- StateProvider sets up the reactive state store for the whole tree -->
        <StateProvider :initial-state="initialState">
            <DemoRenderer />
        </StateProvider>
    </view>
</template>

<style scoped>
.page {
    min-height: 100vh;
}
</style>

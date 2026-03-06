<script lang="ts">
  import {
    ActionProvider,
    ValidationProvider,
    VisibilityProvider,
    Renderer,
    getStateContext,
  } from "@json-render/svelte";
  import { demoSpec } from "./lib/spec";
  import { registry } from "./lib/registry";

  const state = getStateContext();

  const handlers = {
    increment: async () => {
      state.set("/count", Number(state.get("/count") || 0) + 1);
    },
    decrement: async () => {
      state.set("/count", Math.max(0, Number(state.get("/count") || 0) - 1));
    },
    reset: async () => {
      state.set("/count", 0);
    },
    toggleItem: async (params: Record<string, unknown>) => {
      const index = params.index as number;
      const todos = (
        state.get("/todos") as Array<{
          id: number;
          title: string;
          completed: boolean;
        }>
      ).map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item,
      );
      state.set("/todos", todos);
    },
  };
</script>

<ActionProvider {handlers}>
  <VisibilityProvider>
    <ValidationProvider>
      <Renderer spec={demoSpec} {registry} />
    </ValidationProvider>
  </VisibilityProvider>
</ActionProvider>

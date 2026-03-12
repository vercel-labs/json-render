import {
  ActionProvider,
  ValidationProvider,
  VisibilityProvider,
  Renderer,
  useStateStore,
} from "@json-render/solid";
import { demoSpec } from "./lib/spec";
import { registry } from "./lib/registry";

export function DemoRenderer() {
  const stateStore = useStateStore();

  const handlers = {
    increment: async () => {
      stateStore.set("/count", Number(stateStore.get("/count") || 0) + 1);
    },
    decrement: async () => {
      stateStore.set(
        "/count",
        Math.max(0, Number(stateStore.get("/count") || 0) - 1),
      );
    },
    reset: async () => {
      stateStore.set("/count", 0);
    },
    toggleItem: async (params: Record<string, unknown>) => {
      const index = params.index as number;
      const todos = (
        stateStore.get("/todos") as Array<{
          id: number;
          title: string;
          completed: boolean;
        }>
      ).map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item,
      );
      stateStore.set("/todos", todos);
    },
  };

  return (
    <ActionProvider handlers={handlers}>
      <VisibilityProvider>
        <ValidationProvider>
          <Renderer spec={demoSpec} registry={registry} />
        </ValidationProvider>
      </VisibilityProvider>
    </ActionProvider>
  );
}

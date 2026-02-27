type Get = (path: string) => unknown;
type Set = (path: string, value: unknown) => void;

/** Stub actions for defineRegistry (no-ops; real logic is in makeHandlers) */
export const actionStubs = {
  increment: async () => {},
  decrement: async () => {},
  reset: async () => {},
  toggleItem: async () => {},
  switchToVue: async () => {},
  switchToReact: async () => {},
};

/** Creates action handlers that close over the state store's get/set */
export function makeHandlers(get: Get, set: Set) {
  return {
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
      if (item) todos[index] = { ...item, completed: !item.completed };
      set("/todos", todos);
    },
    switchToVue: async () => {
      document.dispatchEvent(
        new CustomEvent("switch-renderer", { detail: "vue" }),
      );
    },
    switchToReact: async () => {
      document.dispatchEvent(
        new CustomEvent("switch-renderer", { detail: "react" }),
      );
    },
  };
}

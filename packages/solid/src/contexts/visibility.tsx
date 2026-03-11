import { createContext, useContext, type ParentProps } from "solid-js";
import {
  evaluateVisibility,
  type VisibilityCondition,
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import { useStateStore } from "./state";

export interface VisibilityContextValue {
  isVisible: (condition: VisibilityCondition | undefined) => boolean;
  ctx: CoreVisibilityContext;
}

const VisibilityContext = createContext<VisibilityContextValue | null>(null);

export type VisibilityProviderProps = ParentProps;

export function VisibilityProvider(props: VisibilityProviderProps) {
  const stateStore = useStateStore();

  const visibilityCtx: CoreVisibilityContext = {
    get stateModel() {
      return stateStore.state;
    },
  };

  const value: VisibilityContextValue = {
    isVisible: (condition: VisibilityCondition | undefined) =>
      evaluateVisibility(condition, visibilityCtx),
    ctx: visibilityCtx,
  };

  return (
    <VisibilityContext.Provider value={value}>
      {props.children}
    </VisibilityContext.Provider>
  );
}

export function useVisibility(): VisibilityContextValue {
  const ctx = useContext(VisibilityContext);
  if (!ctx) {
    throw new Error("useVisibility must be used within a VisibilityProvider");
  }
  return ctx;
}

export function useIsVisible(
  condition: VisibilityCondition | undefined,
): boolean {
  const { isVisible } = useVisibility();
  return isVisible(condition);
}

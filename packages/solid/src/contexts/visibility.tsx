import {
  createContext,
  useContext,
  createMemo,
  type ParentProps,
} from "solid-js";
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
  const { state } = useStateStore();

  const ctx = createMemo<CoreVisibilityContext>(() => ({
    stateModel: state,
  }));

  const isVisible = createMemo(
    () => (condition: VisibilityCondition | undefined) =>
      evaluateVisibility(condition, ctx()),
  );

  const value = createMemo<VisibilityContextValue>(() => ({
    isVisible: isVisible(),
    ctx: ctx(),
  }));

  return (
    <VisibilityContext.Provider value={value()}>
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

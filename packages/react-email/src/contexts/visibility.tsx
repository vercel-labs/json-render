import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
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

export interface VisibilityProviderProps {
  children: ReactNode;
}

export function VisibilityProvider({ children }: VisibilityProviderProps) {
  const { state } = useStateStore();

  const ctx: CoreVisibilityContext = useMemo(
    () => ({ stateModel: state }),
    [state],
  );

  const isVisible = useMemo(
    () => (condition: VisibilityCondition | undefined) =>
      evaluateVisibility(condition, ctx),
    [ctx],
  );

  const value = useMemo<VisibilityContextValue>(
    () => ({ isVisible, ctx }),
    [isVisible, ctx],
  );

  return (
    <VisibilityContext.Provider value={value}>
      {children}
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

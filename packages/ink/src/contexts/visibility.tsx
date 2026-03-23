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

/**
 * Visibility context value
 */
export interface VisibilityContextValue {
  /** Evaluate a visibility condition */
  isVisible: (condition: VisibilityCondition | undefined) => boolean;
  /** The underlying visibility context */
  ctx: CoreVisibilityContext;
}

const VisibilityContext = createContext<VisibilityContextValue | null>(null);

/**
 * Props for VisibilityProvider
 */
export interface VisibilityProviderProps {
  children: ReactNode;
}

/**
 * Provider for visibility evaluation
 */
export function VisibilityProvider({ children }: VisibilityProviderProps) {
  const { state } = useStateStore();

  const ctx: CoreVisibilityContext = useMemo(
    () => ({
      stateModel: state,
    }),
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

/**
 * Hook to access visibility evaluation
 */
export function useVisibility(): VisibilityContextValue {
  const ctx = useContext(VisibilityContext);
  if (!ctx) {
    throw new Error("useVisibility must be used within a VisibilityProvider");
  }
  return ctx;
}

/**
 * Hook to check if a condition is visible
 */
export function useIsVisible(
  condition: VisibilityCondition | undefined,
): boolean {
  const { isVisible } = useVisibility();
  return isVisible(condition);
}

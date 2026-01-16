import {
  createContext,
  useContext,
  createMemo,
  type JSX,
  type Accessor,
} from "solid-js";
import {
  evaluateVisibility,
  type VisibilityCondition,
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import { useData } from "./data";

/**
 * Visibility context value
 */
export interface VisibilityContextValue {
  /** Evaluate a visibility condition */
  isVisible: (condition: VisibilityCondition | undefined) => boolean;
  /** The underlying visibility context (accessor) */
  ctx: Accessor<CoreVisibilityContext>;
}

const VisibilityContext = createContext<VisibilityContextValue>();

/**
 * Props for VisibilityProvider
 */
export interface VisibilityProviderProps {
  children: JSX.Element;
}

/**
 * Provider for visibility evaluation
 */
export function VisibilityProvider(props: VisibilityProviderProps) {
  const { data, authState } = useData();

  const ctx = createMemo<CoreVisibilityContext>(() => ({
    dataModel: data(),
    authState: authState(),
  }));

  const isVisible = (condition: VisibilityCondition | undefined): boolean =>
    evaluateVisibility(condition, ctx());

  const value: VisibilityContextValue = {
    isVisible,
    ctx,
  };

  return (
    <VisibilityContext.Provider value={value}>
      {props.children}
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

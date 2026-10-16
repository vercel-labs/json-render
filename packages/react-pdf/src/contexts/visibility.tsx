import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  createDirectiveRegistry,
  evaluateVisibility,
  type ComputedFunction,
  type DirectiveDefinition,
  type PropResolutionContext,
  type VisibilityCondition,
} from "@json-render/core";
import { useStateStore } from "./state";

export interface VisibilityContextValue {
  isVisible: (condition: VisibilityCondition | undefined) => boolean;
  ctx: PropResolutionContext;
}

const VisibilityContext = createContext<VisibilityContextValue | null>(null);

export interface VisibilityProviderProps {
  /** Named functions for `$computed` expressions in props */
  functions?: Record<string, ComputedFunction>;
  /** Custom directives for user-defined `$`-prefixed dynamic values */
  directives?: DirectiveDefinition[];
  children: ReactNode;
}

export function VisibilityProvider({
  functions,
  directives,
  children,
}: VisibilityProviderProps) {
  const { state } = useStateStore();

  const directiveRegistry = useMemo(
    () => (directives ? createDirectiveRegistry(directives) : undefined),
    [directives],
  );

  const ctx: PropResolutionContext = useMemo(
    () => ({ stateModel: state, functions, directives: directiveRegistry }),
    [state, functions, directiveRegistry],
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

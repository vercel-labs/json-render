import React, { createContext, useContext, type ReactNode } from "react";

export interface RepeatScopeValue {
  item: unknown;
  index: number;
  basePath: string;
}

const RepeatScopeContext = createContext<RepeatScopeValue | null>(null);

export function RepeatScopeProvider({
  item,
  index,
  basePath,
  children,
}: RepeatScopeValue & { children: ReactNode }) {
  return (
    <RepeatScopeContext.Provider value={{ item, index, basePath }}>
      {children}
    </RepeatScopeContext.Provider>
  );
}

export function useRepeatScope(): RepeatScopeValue | null {
  return useContext(RepeatScopeContext);
}

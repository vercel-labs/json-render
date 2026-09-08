import React, { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import type { ComponentRegistry } from "@json-render/react";

export interface StartAppContextValue {
  registry: ComponentRegistry;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  navigate: (href: string) => void;
}

const StartAppContext = createContext<StartAppContextValue | null>(null);

export interface StartAppProviderProps {
  registry: ComponentRegistry;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  children: ReactNode;
}

/** Provide the component registry, actions, and TanStack navigation. */
export function StartAppProvider({
  registry,
  handlers,
  children,
}: StartAppProviderProps) {
  const router = useRouter();
  const navigate = React.useCallback(
    (href: string) => {
      void router.navigate({ to: href });
    },
    [router],
  );
  const value = React.useMemo(
    () => ({ registry, handlers, navigate }),
    [registry, handlers, navigate],
  );

  return (
    <StartAppContext.Provider value={value}>
      {children}
    </StartAppContext.Provider>
  );
}

/** Access the current TanStack Start json-render application context. */
export function useStartApp(): StartAppContextValue {
  const context = useContext(StartAppContext);
  if (!context) {
    throw new Error(
      "[json-render/tanstack-start] useStartApp must be used within a " +
        "<StartAppProvider>.",
    );
  }
  return context;
}

export function useOptionalStartApp(): StartAppContextValue | null {
  return useContext(StartAppContext);
}

import React, { createContext, useContext, type ReactNode } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import type { ComputedFunction } from "@json-render/core";
import type { ComponentRegistry } from "@json-render/react";
import type { StartAppSpec } from "../types";

export interface StartAppContextValue {
  registry: ComponentRegistry;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  spec?: StartAppSpec;
  functions?: Record<string, ComputedFunction>;
  pathname: string;
  navigate: (href: string) => void;
}

const StartAppContext = createContext<StartAppContextValue | null>(null);

export interface StartAppProviderProps {
  registry: ComponentRegistry;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  /** Application spec used to resolve route-specific fallback components. */
  spec?: StartAppSpec;
  /** Named functions available to `$computed` prop expressions. */
  functions?: Record<string, ComputedFunction>;
  children: ReactNode;
}

/** Provide rendering dependencies, route fallbacks, and TanStack navigation. */
export function StartAppProvider({
  registry,
  handlers,
  spec,
  functions,
  children,
}: StartAppProviderProps) {
  const router = useRouter();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = React.useCallback(
    (href: string) => {
      void router.navigate({ to: href });
    },
    [router],
  );
  const value = React.useMemo(
    () => ({ registry, handlers, spec, functions, pathname, navigate }),
    [registry, handlers, spec, functions, pathname, navigate],
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

import React, { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import type { ComponentRegistry } from "@json-render/react";

/**
 * Context value holding the component registry, action handlers,
 * and the TanStack Router navigate function.
 */
export interface StartAppContextValue {
  registry: ComponentRegistry;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  navigate: (href: string) => void;
}

const StartAppContext = createContext<StartAppContextValue | null>(null);

/**
 * Props for StartAppProvider.
 */
export interface StartAppProviderProps {
  /** Component registry for rendering */
  registry: ComponentRegistry;
  /** Action handlers */
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  children: ReactNode;
}

/**
 * Provider that holds the component registry and action handlers
 * for the entire json-render TanStack Start application.
 *
 * Wrap your root route with this provider:
 *
 * ```tsx
 * // src/routes/__root.tsx
 * import { StartAppProvider } from "@json-render/start";
 * import { registry, handlers } from "@/lib/registry";
 *
 * function RootComponent() {
 *   return (
 *     <StartAppProvider registry={registry} handlers={handlers}>
 *       <Outlet />
 *     </StartAppProvider>
 *   );
 * }
 * ```
 */
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

/**
 * Hook to access the StartApp context.
 * Must be used within a StartAppProvider.
 */
export function useStartApp(): StartAppContextValue {
  const ctx = useContext(StartAppContext);
  if (!ctx) {
    throw new Error(
      "[json-render/start] useStartApp must be used within a <StartAppProvider>. " +
        "Wrap your root route with <StartAppProvider registry={...} handlers={...}>.",
    );
  }
  return ctx;
}

"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ComponentRegistry } from "@json-render/react";

/**
 * Context value holding the component registry, action handlers,
 * and the Next.js router navigate function.
 */
export interface NextAppContextValue {
  registry: ComponentRegistry;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  navigate: (href: string) => void;
}

const NextAppContext = createContext<NextAppContextValue | null>(null);

/**
 * Props for NextAppProvider.
 */
export interface NextAppProviderProps {
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
 * for the entire json-render Next.js application.
 *
 * Wrap your route layout with this provider:
 *
 * ```tsx
 * // app/[[...slug]]/layout.tsx
 * import { NextAppProvider } from "@json-render/next";
 * import { registry, handlers } from "@/lib/registry";
 *
 * export default function Layout({ children }) {
 *   return (
 *     <NextAppProvider registry={registry} handlers={handlers}>
 *       {children}
 *     </NextAppProvider>
 *   );
 * }
 * ```
 */
export function NextAppProvider({
  registry,
  handlers,
  children,
}: NextAppProviderProps) {
  const router = useRouter();
  const navigate = React.useCallback(
    (href: string) => router.push(href),
    [router],
  );

  const value = React.useMemo(
    () => ({ registry, handlers, navigate }),
    [registry, handlers, navigate],
  );

  return (
    <NextAppContext.Provider value={value}>{children}</NextAppContext.Provider>
  );
}

/**
 * Hook to access the NextApp context.
 * Must be used within a NextAppProvider.
 */
export function useNextApp(): NextAppContextValue {
  const ctx = useContext(NextAppContext);
  if (!ctx) {
    throw new Error(
      "[json-render/next] useNextApp must be used within a <NextAppProvider>. " +
        "Wrap your root layout with <NextAppProvider registry={...} handlers={...}>.",
    );
  }
  return ctx;
}

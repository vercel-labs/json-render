import React from "react";
import { Link as RouterLink } from "@tanstack/react-router";
import type { ComponentRenderProps } from "@json-render/react";

/**
 * Props expected by the Link component in json-render specs.
 */
export interface LinkProps {
  /** The target URL or route path */
  href: string;
  /** Whether to replace the current history entry */
  replace?: boolean;
  /** Whether to preload the linked route (maps to TanStack `preload: "intent"`) */
  prefetch?: boolean;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Built-in Link component for json-render TanStack Start specs.
 *
 * Wraps `@tanstack/react-router`'s Link for client-side navigation
 * between routes.
 *
 * Usage in a spec:
 * ```json
 * {
 *   "type": "Link",
 *   "props": { "href": "/about" },
 *   "children": ["link-text"]
 * }
 * ```
 */
export function Link({ element, children }: ComponentRenderProps<LinkProps>) {
  const { href, replace, prefetch, className, style } =
    element.props as LinkProps;

  return (
    <RouterLink
      to={href}
      replace={replace}
      preload={prefetch === undefined ? undefined : prefetch ? "intent" : false}
      className={className}
      style={style}
    >
      {children}
    </RouterLink>
  );
}

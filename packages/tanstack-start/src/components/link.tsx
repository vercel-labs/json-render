import React from "react";
import { Link as RouterLink } from "@tanstack/react-router";
import type { ComponentRenderProps } from "@json-render/react";

export interface LinkProps {
  href: string;
  replace?: boolean;
  /** Preload the target route on intent. */
  prefetch?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Built-in client navigation component for generated specs. */
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

"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Badge({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const badgeVariant = props.variant as string;
  const badgeClass =
    badgeVariant === "success"
      ? "bg-green-100 text-green-800"
      : badgeVariant === "warning"
        ? "bg-yellow-100 text-yellow-800"
        : badgeVariant === "danger"
          ? "bg-red-100 text-red-800"
          : "bg-muted text-foreground";

  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClass} ${baseClass} ${customClass}`}
    >
      {(props.text ?? props.label) as string}
    </span>
  );
}

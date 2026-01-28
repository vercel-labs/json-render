"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Grid({ element, children }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const hasCustomCols = customClass.includes("grid-cols-");
  const cols = hasCustomCols
    ? ""
    : props.columns === 6
      ? "grid-cols-6"
      : props.columns === 5
        ? "grid-cols-5"
        : props.columns === 4
          ? "grid-cols-4"
          : props.columns === 3
            ? "grid-cols-3"
            : props.columns === 2
              ? "grid-cols-2"
              : "grid-cols-1";
  const gridGap =
    props.gap === "lg" ? "gap-3" : props.gap === "sm" ? "gap-1" : "gap-2";

  return (
    <div className={`grid ${cols} ${gridGap} ${baseClass} ${customClass}`}>
      {children}
    </div>
  );
}

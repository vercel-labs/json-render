"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Stack({ element, children }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const isHorizontal = props.direction === "horizontal";

  const gapClass =
    props.gap === "lg"
      ? "gap-3"
      : props.gap === "md"
        ? "gap-2"
        : props.gap === "sm"
          ? "gap-1"
          : props.gap === "none"
            ? "gap-0"
            : "gap-2";

  const alignClass =
    props.align === "center"
      ? "items-center"
      : props.align === "end"
        ? "items-end"
        : props.align === "stretch"
          ? "items-stretch"
          : "items-start";

  const justifyClass =
    props.justify === "center"
      ? "justify-center"
      : props.justify === "end"
        ? "justify-end"
        : props.justify === "between"
          ? "justify-between"
          : props.justify === "around"
            ? "justify-around"
            : "";

  return (
    <div
      className={`flex ${isHorizontal ? "flex-row flex-wrap" : "flex-col"} ${gapClass} ${alignClass} ${justifyClass} ${baseClass} ${customClass}`}
    >
      {children}
    </div>
  );
}

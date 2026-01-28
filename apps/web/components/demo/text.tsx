"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Text({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const textVariant = props.variant as string;
  const textClass =
    textVariant === "caption"
      ? "text-[10px]"
      : textVariant === "muted"
        ? "text-xs text-muted-foreground"
        : "text-xs";

  return (
    <p className={`${textClass} text-left ${baseClass} ${customClass}`}>
      {(props.text ?? props.content) as string}
    </p>
  );
}

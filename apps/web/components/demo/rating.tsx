"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Rating({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const ratingValue = (props.value as number) || 0;
  const maxRating = (props.max as number) || 5;

  return (
    <div className={`${baseClass} ${customClass}`}>
      {props.label ? (
        <div className="text-[10px] text-muted-foreground mb-1 text-left">
          {props.label as string}
        </div>
      ) : null}
      <div className="flex gap-0.5">
        {Array.from({ length: maxRating }).map((_, i) => (
          <span
            key={i}
            className={`text-sm ${i < ratingValue ? "text-yellow-400" : "text-foreground/30"}`}
          >
            *
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Alert({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const alertType = props.type as string;
  const alertClass =
    alertType === "success"
      ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      : alertType === "warning"
        ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100"
        : alertType === "error"
          ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
          : "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";

  return (
    <div
      className={`p-2 rounded border ${alertClass} ${baseClass} ${customClass}`}
    >
      <div className="text-xs font-medium">{props.title as string}</div>
      {props.message ? (
        <div className="text-[10px] mt-0.5">{props.message as string}</div>
      ) : null}
    </div>
  );
}

"use client";

import { standardComponents } from "@json-render/react-email";
import type {
  ComponentRenderProps,
  StandardComponentProps,
} from "@json-render/react-email";

function BrowserHtml({
  children,
}: ComponentRenderProps<StandardComponentProps<"Html">>) {
  return <div data-email-html>{children}</div>;
}

function BrowserHead({
  children,
}: ComponentRenderProps<StandardComponentProps<"Head">>) {
  return <>{children}</>;
}

function BrowserBody({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Body">>) {
  return <div style={element.props.style ?? undefined}>{children}</div>;
}

export const registry = {
  ...standardComponents,
  Html: BrowserHtml,
  Head: BrowserHead,
  Body: BrowserBody,
};

export function Fallback({ type }: { type: string }) {
  return (
    <div
      style={{
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#991b1b",
        borderRadius: 6,
        padding: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
      }}
    >
      Unknown email component: {type}
    </div>
  );
}

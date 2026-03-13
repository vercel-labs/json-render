import { escapeHtml } from "@json-render/astro";
import type { ComponentRegistry } from "@json-render/astro";

export const registry: ComponentRegistry = {
  Section: ({ props, children }) => {
    const attrs = [
      props.id ? ` id="${escapeHtml(props.id)}"` : "",
      props.className ? ` class="${escapeHtml(props.className)}"` : "",
    ].join("");
    return `<section${attrs}>${children}</section>`;
  },

  Card: ({ props, children }) =>
    `<article style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
      <h3 style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111827">${escapeHtml(props.title)}</h3>
      ${props.subtitle ? `<p style="margin:0 0 12px;font-size:13px;color:#6b7280">${escapeHtml(props.subtitle)}</p>` : ""}
      ${children}
    </article>`,

  Heading: ({ props }) => {
    const tag = props.level || "h2";
    return `<${tag}>${escapeHtml(props.text)}</${tag}>`;
  },

  Text: ({ props }) =>
    `<p style="margin:0;line-height:1.6">${escapeHtml(props.content)}</p>`,

  Badge: ({ props }) => {
    const colors: Record<string, { bg: string; fg: string; border: string }> = {
      default: { bg: "#e0f2fe", fg: "#0369a1", border: "#bae6fd" },
      success: { bg: "#dcfce7", fg: "#15803d", border: "#bbf7d0" },
      warning: { bg: "#fef9c3", fg: "#a16207", border: "#fde68a" },
    };
    const c = colors[props.variant ?? "default"] ?? colors.default!;
    return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:500;background:${c.bg};color:${c.fg};border:1px solid ${c.border}">${escapeHtml(props.label)}</span>`;
  },

  List: ({ children }) =>
    `<ul style="margin:0;padding-left:20px">${children}</ul>`,

  ListItem: ({ props }) =>
    `<li style="margin:4px 0">${escapeHtml(props.text)}</li>`,

  Link: ({ props }) =>
    `<a href="${escapeHtml(props.href)}" style="color:#3b82f6;text-decoration:underline">${escapeHtml(props.text)}</a>`,
};

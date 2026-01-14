"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

const vercelTheme = {
  name: "vercel",
  type: "dark" as const,
  colors: {
    "editor.background": "transparent",
    "editor.foreground": "#EDEDED",
  },
  settings: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#666666" },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: { foreground: "#50E3C2" },
    },
    {
      scope: ["constant.numeric", "constant.language.boolean", "constant.language.null"],
      settings: { foreground: "#50E3C2" },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: { foreground: "#FF0080" },
    },
    {
      scope: ["keyword.operator", "keyword.control"],
      settings: { foreground: "#FF0080" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: "#7928CA" },
    },
    {
      scope: ["variable", "variable.other", "variable.parameter"],
      settings: { foreground: "#EDEDED" },
    },
    {
      scope: ["entity.name.tag", "support.class.component", "entity.name.type"],
      settings: { foreground: "#FF0080" },
    },
    {
      scope: ["punctuation", "meta.brace", "meta.bracket"],
      settings: { foreground: "#888888" },
    },
    {
      scope: ["support.type.property-name", "entity.name.tag.json", "meta.object-literal.key"],
      settings: { foreground: "#EDEDED" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "#50E3C2" },
    },
    {
      scope: ["support.type.primitive", "entity.name.type.primitive"],
      settings: { foreground: "#50E3C2" },
    },
  ],
};

interface CodeBlockProps {
  code: string;
  lang: "json" | "tsx" | "typescript";
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    codeToHtml(code, {
      lang,
      theme: vercelTheme,
    }).then(setHtml);
  }, [code, lang]);

  if (!html) {
    return (
      <pre className="text-muted-foreground">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="text-[11px] leading-relaxed [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:m-0! [&_pre]:border-none! [&_pre]:rounded-none! [&_pre]:text-[11px]! [&_code]:bg-transparent! [&_code]:p-0! [&_code]:rounded-none! [&_code]:text-[11px]!"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

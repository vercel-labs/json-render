"use client";

import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";
import { CopyButton } from "./copy-button";

const vercelDarkTheme = {
  name: "vercel-dark",
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
      scope: [
        "constant.numeric",
        "constant.language.boolean",
        "constant.language.null",
      ],
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
      scope: [
        "support.type.property-name",
        "entity.name.tag.json",
        "meta.object-literal.key",
      ],
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

const vercelLightTheme = {
  name: "vercel-light",
  type: "light" as const,
  colors: {
    "editor.background": "transparent",
    "editor.foreground": "#171717",
  },
  settings: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#6b7280" },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: { foreground: "#067a6e" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language.boolean",
        "constant.language.null",
      ],
      settings: { foreground: "#067a6e" },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: { foreground: "#d6409f" },
    },
    {
      scope: ["keyword.operator", "keyword.control"],
      settings: { foreground: "#d6409f" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: "#6e56cf" },
    },
    {
      scope: ["variable", "variable.other", "variable.parameter"],
      settings: { foreground: "#171717" },
    },
    {
      scope: ["entity.name.tag", "support.class.component", "entity.name.type"],
      settings: { foreground: "#d6409f" },
    },
    {
      scope: ["punctuation", "meta.brace", "meta.bracket"],
      settings: { foreground: "#6b7280" },
    },
    {
      scope: [
        "support.type.property-name",
        "entity.name.tag.json",
        "meta.object-literal.key",
      ],
      settings: { foreground: "#171717" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "#067a6e" },
    },
    {
      scope: ["support.type.primitive", "entity.name.type.primitive"],
      settings: { foreground: "#067a6e" },
    },
  ],
};

// Preload highlighter on module load
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [vercelLightTheme, vercelDarkTheme],
      langs: ["json", "tsx", "typescript", "yaml"],
    });
  }
  return highlighterPromise;
}

// Start loading immediately when module is imported
if (typeof window !== "undefined") {
  getHighlighter();
}

interface CodeBlockProps {
  code: string;
  lang: "json" | "tsx" | "typescript" | "yaml";
  fillHeight?: boolean;
  hideCopyButton?: boolean;
}

export function CodeBlock({
  code,
  lang,
  fillHeight,
  hideCopyButton,
}: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    getHighlighter().then((highlighter) => {
      setHtml(
        highlighter.codeToHtml(code, {
          lang,
          themes: {
            light: "vercel-light",
            dark: "vercel-dark",
          },
          defaultColor: false,
        }),
      );
    });
  }, [code, lang]);

  if (!html) {
    return fillHeight ? <div className="p-3" /> : null;
  }

  return (
    <div className={`relative group ${fillHeight ? "p-3" : ""}`}>
      {!hideCopyButton && (
        <div className="float-right sticky top-3 z-10 ml-2">
          <CopyButton
            text={code}
            className="opacity-0 group-hover:opacity-100 text-neutral-400"
          />
        </div>
      )}
      <div
        className="text-[13px] leading-relaxed [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:m-0! [&_pre]:border-none! [&_pre]:rounded-none! [&_pre]:text-[13px]! [&_pre]:overflow-visible! [&_code]:bg-transparent! [&_code]:p-0! [&_code]:rounded-none! [&_code]:text-[13px]!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect, type ReactNode } from "react";
import { stringify } from "yaml";
import { useEditorStore } from "@/lib/store";
import { sceneToSpec } from "@/lib/scene-to-spec";

const YAML_TOKEN_RE =
  /(^[ \t]*[\w][\w.-]*:(?=\s|$))|("(?:\\.|[^"\\])*"|'(?:\\'|[^'\\])*')|(true|false)|(null|~)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?=\s|$))/gm;

function highlightYaml(yaml: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = YAML_TOKEN_RE.exec(yaml)) !== null) {
    if (match.index > lastIndex) {
      parts.push(yaml.slice(lastIndex, match.index));
    }

    const [full, key, str, bool, nil, num] = match;
    let color: string;
    if (key) color = "#c4a7e7";
    else if (str) color = "#a8d4a2";
    else if (bool) color = "#f6c177";
    else if (nil) color = "#6e6a86";
    else if (num) color = "#ebbcba";
    else color = "#8a8a8a";

    parts.push(
      <span key={match.index} style={{ color }}>
        {full}
      </span>,
    );
    lastIndex = match.index + full.length;
  }

  if (lastIndex < yaml.length) {
    parts.push(yaml.slice(lastIndex));
  }

  return parts;
}

export function JsonPane() {
  const [mounted, setMounted] = useState(false);
  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);

  useEffect(() => setMounted(true), []);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || scenes[0],
    [scenes, activeSceneId],
  );

  const spec = useMemo(() => {
    if (!activeScene) return null;
    return sceneToSpec(activeScene);
  }, [activeScene]);

  const yaml = useMemo(() => {
    if (!spec) return "";
    return stringify(spec, { indent: 2, lineWidth: 0 });
  }, [spec]);

  const highlighted = useMemo(() => {
    if (!yaml) return null;
    return highlightYaml(yaml);
  }, [yaml]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-9 flex items-center px-3 border-b border-[#1e1e1e] flex-shrink-0">
        <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider font-mono">
          Spec
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="p-3 text-[11px] leading-[1.5] text-[#555] font-mono whitespace-pre select-all">
          {mounted ? highlighted : ""}
        </pre>
      </div>
    </div>
  );
}

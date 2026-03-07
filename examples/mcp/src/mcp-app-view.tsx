import { JSONUIProvider, Renderer } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { defineRegistry } from "@json-render/react";
import { useJsonRenderApp } from "@json-render/mcp/app";
import { catalog } from "./catalog";
import { useState, useEffect } from "react";

const { registry } = defineRegistry(catalog, {
  components: {
    ...shadcnComponents,
  },
});

const debugStyle = {
  padding: 12,
  fontFamily: "monospace",
  fontSize: 12,
  color: "#000",
  background: "#fffbe6",
  border: "1px solid #faad14",
  borderRadius: 4,
  margin: 8,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-all" as const,
};

export function McpAppView() {
  const [logs, setLogs] = useState<string[]>(["App mounted"]);

  const addLog = (msg: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toISOString().slice(11, 23)} ${msg}`,
    ]);
  };

  const { spec, loading, connected, connecting, error } = useJsonRenderApp({
    name: "json-render-mcp-example",
    version: "1.0.0",
  });

  useEffect(() => {
    addLog(
      `State: connecting=${connecting} connected=${connected} error=${error?.message ?? "none"} loading=${loading} spec=${spec ? "yes" : "null"}`,
    );
  }, [connecting, connected, error, loading, spec]);

  useEffect(() => {
    if (spec) {
      addLog(
        `Spec received: root=${spec.root}, elements=${Object.keys(spec.elements ?? {}).join(",")}`,
      );
    }
  }, [spec]);

  if (error) {
    return (
      <div style={debugStyle}>
        <div style={{ color: "#ef4444", fontWeight: "bold" }}>
          Connection error: {error.message}
        </div>
        <div style={{ marginTop: 8 }}>{logs.join("\n")}</div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div style={debugStyle}>
        <div>
          {connecting
            ? "Connecting to host..."
            : loading
              ? "Waiting for UI spec..."
              : "No spec received."}
        </div>
        <div style={{ marginTop: 8 }}>{logs.join("\n")}</div>
      </div>
    );
  }

  return (
    <div>
      <JSONUIProvider registry={registry} initialState={spec.state ?? {}}>
        <Renderer spec={spec} registry={registry} loading={loading} />
      </JSONUIProvider>
    </div>
  );
}

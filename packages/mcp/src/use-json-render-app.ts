import { useState, useEffect, useCallback, useRef } from "react";
import type { Spec } from "@json-render/core";
import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Options for the `useJsonRenderApp` hook.
 */
export interface UseJsonRenderAppOptions {
  /** App name shown during initialization. Defaults to `"json-render"`. */
  name?: string;
  /** App version. Defaults to `"1.0.0"`. */
  version?: string;
}

/**
 * Return value of `useJsonRenderApp`.
 */
export interface UseJsonRenderAppReturn {
  /** The current json-render spec (null until the first tool result). */
  spec: Spec | null;
  /** Whether the app is still connecting to the host. */
  connecting: boolean;
  /** Whether the app is connected to the host. */
  connected: boolean;
  /** Connection error, if any. */
  error: Error | null;
  /** Whether the spec is still being received / parsed. */
  loading: boolean;
  /** The underlying MCP App instance. */
  app: App | null;
  /**
   * Call a tool on the MCP server and update the spec from the result.
   * Useful for refresh / drill-down interactions.
   */
  callServerTool: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<void>;
}

type ToolResultContent = CallToolResult["content"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readSpec(value: unknown): Spec | null {
  const spec = isRecord(value) && "spec" in value ? value.spec : value;
  if (
    spec &&
    typeof spec === "object" &&
    "root" in spec &&
    typeof spec.root === "string" &&
    "elements" in spec &&
    isRecord(spec.elements)
  ) {
    return spec as Spec;
  }
  return null;
}

function parseSpecFromToolResult(result: {
  content?: ToolResultContent[];
  structuredContent?: unknown;
  isError?: boolean;
}): Spec | null {
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (text) {
    try {
      const spec = readSpec(JSON.parse(text));
      if (spec) return spec;
    } catch {
      // A tool can send a text summary alongside its structured result.
    }
  }
  if (result.isError) return null;
  const spec = readSpec(result.structuredContent);
  if (
    !spec ||
    !Object.hasOwn(spec.elements, spec.root) ||
    !Object.values(spec.elements).every(
      (element) =>
        isRecord(element) &&
        typeof element.type === "string" &&
        isRecord(element.props),
    )
  ) {
    return null;
  }
  return spec;
}

/**
 * React hook that connects to the MCP host, listens for tool results,
 * and maintains the current json-render spec.
 *
 * Follows the official MCP Apps pattern: create an `App` instance,
 * register the `ontoolresult` handler, then call `app.connect()`
 * which internally creates a PostMessageTransport to the host.
 */
export function useJsonRenderApp(
  options: UseJsonRenderAppOptions = {},
): UseJsonRenderAppReturn {
  const { name = "json-render", version = "1.0.0" } = options;

  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const appRef = useRef<App | null>(null);

  useEffect(() => {
    const app = new App({ name, version });
    appRef.current = app;

    app.ontoolresult = (result: { content?: ToolResultContent[] }) => {
      const parsed = parseSpecFromToolResult(result);
      if (parsed) {
        setSpec(parsed);
        setLoading(false);
      }
    };

    // Let the App class handle transport creation internally,
    // matching the official MCP Apps quickstart pattern.
    app
      .connect()
      .then(() => {
        setConnected(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      app.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callServerTool = useCallback(
    async (toolName: string, args: Record<string, unknown> = {}) => {
      if (!appRef.current) return;
      setLoading(true);
      try {
        const result = await appRef.current.callServerTool({
          name: toolName,
          arguments: args,
        });
        const parsed = parseSpecFromToolResult(result);
        if (parsed) setSpec(parsed);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    spec,
    connecting: !connected && !error,
    connected,
    error,
    loading,
    app: appRef.current,
    callServerTool,
  };
}

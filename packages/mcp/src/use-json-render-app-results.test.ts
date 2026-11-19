// @vitest-environment jsdom

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useJsonRenderApp } from "./use-json-render-app";

type AppSession = {
  ontoolresult?: (result: CallToolResult) => void;
};

const { sessions, callServerTool } = vi.hoisted(() => ({
  sessions: [] as AppSession[],
  callServerTool: vi.fn<() => Promise<CallToolResult>>(),
}));

vi.mock("@modelcontextprotocol/ext-apps", () => ({
  App: class implements AppSession {
    ontoolresult?: AppSession["ontoolresult"];
    connect = async () => {};
    close = async () => {};
    callServerTool = callServerTool;

    constructor() {
      sessions.push(this);
    }
  },
}));

const spec = {
  root: "heading",
  elements: {
    heading: { type: "Text", props: { text: "Dashboard" }, children: [] },
  },
};

beforeEach(() => {
  sessions.length = 0;
  callServerTool.mockReset();
});

describe("MCP tool result formats", () => {
  it("renders a wrapped structured notification with a plain text summary", async () => {
    const { result } = renderHook(() => useJsonRenderApp());

    await act(async () => {
      sessions[0]?.ontoolresult?.({
        content: [{ type: "text", text: "Dashboard ready" }],
        structuredContent: { spec },
      });
    });

    expect(result.current.spec).toEqual(spec);
    expect(result.current.loading).toBe(false);
  });

  it("renders a direct structured result when calling a server tool", async () => {
    callServerTool.mockResolvedValue({ content: [], structuredContent: spec });
    const { result } = renderHook(() => useJsonRenderApp());

    await act(async () => {
      await result.current.callServerTool("refresh-dashboard");
    });

    expect(callServerTool).toHaveBeenCalledWith({
      name: "refresh-dashboard",
      arguments: {},
    });
    expect(result.current.spec).toEqual(spec);
    expect(result.current.loading).toBe(false);
  });

  it("keeps using existing JSON text when structured metadata is unrelated", async () => {
    const { result } = renderHook(() => useJsonRenderApp());

    await act(async () => {
      sessions[0]?.ontoolresult?.({
        content: [{ type: "text", text: JSON.stringify({ spec }) }],
        structuredContent: { spec: { rows: 3 } },
      });
    });

    expect(result.current.spec).toEqual(spec);
    expect(result.current.loading).toBe(false);
  });

  it("prefers the existing text spec when both formats contain a spec", async () => {
    const { result } = renderHook(() => useJsonRenderApp());

    await act(async () => {
      sessions[0]?.ontoolresult?.({
        content: [{ type: "text", text: JSON.stringify(spec) }],
        structuredContent: { ...spec, state: { refreshed: true } },
      });
    });

    expect(result.current.spec).toEqual(spec);
  });

  it("keeps the current spec when a failed tool returns structured data", async () => {
    const { result } = renderHook(() => useJsonRenderApp());
    await act(async () => {
      sessions[0]?.ontoolresult?.({
        content: [{ type: "text", text: JSON.stringify(spec) }],
      });
    });

    callServerTool.mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "Refresh failed" }],
      structuredContent: { spec: { ...spec, state: { failed: true } } },
    });
    await act(async () => {
      await result.current.callServerTool("refresh-dashboard");
    });

    expect(result.current.spec).toEqual(spec);
    expect(result.current.loading).toBe(false);
  });

  it("ignores structured data whose elements are not UI components", async () => {
    const { result } = renderHook(() => useJsonRenderApp());
    await act(async () => {
      sessions[0]?.ontoolresult?.({
        content: [],
        structuredContent: {
          root: "workspace",
          elements: { workspace: { kind: "directory" } },
        },
      });
    });

    expect(result.current.spec).toBeNull();
  });
});

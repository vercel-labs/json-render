import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useJsonRenderApp } from "./use-json-render-app";

type ToolResult = { content: { type: string; text: string }[] };
type Session = {
  close: () => Promise<void>;
  ontoolresult?: (result: ToolResult) => void;
};

const { connect, sessions } = vi.hoisted(() => {
  const sessions: Session[] = [];
  return { connect: vi.fn<() => Promise<void>>(), sessions };
});

vi.mock("@modelcontextprotocol/ext-apps", () => ({
  App: class implements Session {
    connect = connect;
    close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    ontoolresult?: Session["ontoolresult"];

    constructor() {
      sessions.push(this);
    }
  },
}));

function deferredConnection() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function toolResult(root: string): ToolResult {
  const spec = { root, elements: { [root]: { type: "Label", props: {} } } };
  return { content: [{ type: "text", text: JSON.stringify(spec) }] };
}

describe("useJsonRenderApp connection lifecycle", () => {
  beforeEach(() => {
    connect.mockReset();
    sessions.length = 0;
  });

  it("keeps the active connection and tool result after Strict Mode cleanup", async () => {
    const disposed = deferredConnection();
    const current = deferredConnection();
    connect
      .mockReturnValueOnce(disposed.promise)
      .mockReturnValueOnce(current.promise);

    const { result } = renderHook(() => useJsonRenderApp(), {
      reactStrictMode: true,
    });
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.close).toHaveBeenCalledOnce();

    await act(async () => {
      current.resolve();
      sessions[1]?.ontoolresult?.(toolResult("current"));
    });
    await act(async () => {
      disposed.reject(new Error("Not connected"));
      // The SDK dispatches pending notification callbacks on a microtask.
      await Promise.resolve().then(() =>
        sessions[0]?.ontoolresult?.(toolResult("disposed")),
      );
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.spec?.root).toBe("current");
    expect(result.current.loading).toBe(false);
  });

  it("reports an active connection failure even if the discarded connection succeeds", async () => {
    const disposed = deferredConnection();
    const current = deferredConnection();
    const error = new Error("MCP host unavailable");
    connect
      .mockReturnValueOnce(disposed.promise)
      .mockReturnValueOnce(current.promise);

    const { result } = renderHook(() => useJsonRenderApp(), {
      reactStrictMode: true,
    });
    await act(async () => {
      current.reject(error);
      disposed.resolve();
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
    expect(result.current.error).toBe(error);
  });
});

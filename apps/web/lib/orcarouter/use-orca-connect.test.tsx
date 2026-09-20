// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useOrcaConnect } from "./use-orca-connect";

interface SessionPayload {
  sessionId: string;
  flow: "loopback" | "oob";
  status: string;
  authorizeUrl: string;
  callbackUrl: string | null;
  expiresAt: string;
  message: string | null;
  maskedKey: string | null;
}

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    sessionId: "session-1",
    flow: "oob",
    status: "awaiting_code",
    authorizeUrl: "https://www.orcarouter.ai/auth?state=s&code_challenge=c",
    callbackUrl: "oob",
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    message: null,
    maskedKey: null,
    ...overrides,
  };
}

describe("useOrcaConnect", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function respond(...payloads: Array<{ ok?: boolean; body?: unknown }>) {
    for (const payload of payloads) {
      fetchMock.mockResolvedValueOnce({
        ok: payload.ok ?? true,
        json: async () => payload.body ?? {},
      });
    }
  }

  function mount() {
    return renderHook(() => useOrcaConnect());
  }

  function deleteCalls() {
    return fetchMock.mock.calls.filter(
      (call) => (call[1] as RequestInit | undefined)?.method === "DELETE",
    );
  }

  it("starts idle with nothing busy", () => {
    const { result } = mount();
    expect(result.current.status).toBe("idle");
    expect(result.current.busy).toBe(false);
    expect(result.current.authorizeUrl).toBeNull();
  });

  it("starts a login, exposes the authorize URL and marks itself busy", async () => {
    const { result } = mount();
    respond({ body: session() }, { body: session() });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.busy).toBe(true);
    expect(result.current.authorizeUrl).toContain(
      "https://www.orcarouter.ai/auth",
    );
    expect(result.current.sessionId).toBe("session-1");
  });

  it("opens the browser for the loopback flow", async () => {
    const openSpy = vi.fn();
    vi.stubGlobal("open", openSpy);
    const { result } = mount();
    respond(
      {
        body: session({
          flow: "loopback",
          callbackUrl: "http://127.0.0.1:1/cb",
        }),
      },
      { body: session({ flow: "loopback" }) },
    );
    await act(async () => {
      await result.current.start();
    });
    expect(openSpy).toHaveBeenCalled();
  });

  it("cancels explicitly, releasing the busy state and the server lock", async () => {
    const { result } = mount();
    respond({ body: session() }, { body: session() });
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      result.current.cancel();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.busy).toBe(false);
    expect(result.current.authorizeUrl).toBeNull();
    expect(deleteCalls()).toHaveLength(1);
    expect(String(deleteCalls()[0]![0])).toContain("session-1");
  });

  it("releases the login when the authentication method is switched", async () => {
    const { result } = mount();
    respond({ body: session() }, { body: session() });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.flow).toBe("loopback");
    await act(async () => {
      result.current.setFlow("oob");
    });
    expect(result.current.flow).toBe("oob");
    expect(result.current.busy).toBe(false);
    expect(result.current.sessionId).toBeNull();
  });

  it("clears busy and the hint on pagehide without a remount, and a second login can start", async () => {
    const { result } = mount();
    respond({ body: session() }, { body: session() });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.busy).toBe(true);
    expect(result.current.authorizeUrl).not.toBeNull();

    // The browser enters the back-forward cache: no unmount happens.
    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.authorizeUrl).toBeNull();
    expect(result.current.status).toBe("idle");

    // The server cancellation is sent with keepalive, not only via the guard.
    expect(
      deleteCalls().some((call) => (call[1] as RequestInit).keepalive === true),
    ).toBe(true);

    // A second login must be possible without remounting the component.
    respond(
      { body: session({ sessionId: "session-2" }) },
      { body: session({ sessionId: "session-2" }) },
    );
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.busy).toBe(true);
    expect(result.current.sessionId).toBe("session-2");
  });

  it("ignores a late response from a superseded login generation", async () => {
    const { result } = mount();
    let resolveFirst: ((value: unknown) => void) | null = null;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const newer = {
      ok: true,
      json: async () =>
        session({
          sessionId: "session-new",
          authorizeUrl: "https://www.orcarouter.ai/auth?new=1",
        }),
    };
    fetchMock.mockResolvedValue(newer);

    let firstStart: Promise<void> = Promise.resolve();
    await act(async () => {
      firstStart = result.current.start();
    });
    await act(async () => {
      await result.current.start();
    });
    const afterSecond = result.current.authorizeUrl;

    await act(async () => {
      resolveFirst!({
        ok: true,
        json: async () =>
          session({
            sessionId: "session-stale",
            authorizeUrl: "https://www.orcarouter.ai/auth?stale=1",
          }),
      });
      await firstStart;
    });

    // The stale response must not have overwritten the newer login.
    expect(result.current.authorizeUrl).toBe(afterSecond);
    expect(result.current.sessionId).toBe("session-new");
    expect(result.current.authorizeUrl).not.toContain("stale=1");
  });

  it("surfaces a denial from the server as a terminal error and stops polling", async () => {
    const { result } = mount();
    respond(
      { body: session() },
      {
        body: session({
          status: "error",
          message: "OrcaRouter authorization was declined (access_denied).",
        }),
      },
    );
    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toContain("declined");
    expect(result.current.busy).toBe(false);
    expect(result.current.sessionId).toBeNull();
  });

  it("clears the login state on unmount", async () => {
    const { result, unmount } = mount();
    respond({ body: session() }, { body: session() });
    await act(async () => {
      await result.current.start();
    });
    unmount();
    await waitFor(() => expect(deleteCalls().length).toBeGreaterThan(0));
  });

  it("reports a failed session read instead of hanging", async () => {
    const { result } = mount();
    respond({ body: session() }, { ok: false, body: {} });
    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBeTruthy();
    expect(result.current.busy).toBe(false);
  });

  it("submits an out-of-band code and records the masked key", async () => {
    const { result } = mount();
    respond({ body: session() }, { body: session() });
    await act(async () => {
      await result.current.start();
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        session({ status: "connected", maskedKey: "sk-orca-••••-key" }),
    });
    await act(async () => {
      await result.current.submitCode("the-code");
    });
    expect(result.current.status).toBe("connected");
    expect(result.current.maskedKey).toBe("sk-orca-••••-key");
    expect(result.current.sessionId).toBeNull();
  });

  it("never stores the verifier or the raw key in the hook state", async () => {
    const { result } = mount();
    respond({ body: session() }, { body: session() });
    await act(async () => {
      await result.current.start();
    });
    const serialized = JSON.stringify({
      authorizeUrl: result.current.authorizeUrl,
      sessionId: result.current.sessionId,
      error: result.current.error,
      maskedKey: result.current.maskedKey,
    });
    expect(serialized).not.toContain("code_verifier");
    expect(serialized).not.toContain("codeVerifier");
  });
});

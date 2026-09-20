"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OrcaConnectFlow = "loopback" | "oob";

export type OrcaConnectStatus =
  | "idle"
  | "starting"
  | "pending"
  | "awaiting_code"
  | "exchanging"
  | "connected"
  | "error"
  | "cancelled"
  | "expired";

export interface OrcaConnectSessionView {
  sessionId: string;
  flow: OrcaConnectFlow;
  status: OrcaConnectStatus;
  authorizeUrl: string;
  callbackUrl: string | null;
  expiresAt: string;
  message: string | null;
  maskedKey: string | null;
}

export interface UseOrcaConnectReturn {
  status: OrcaConnectStatus;
  /** Non-null while a login is in flight. */
  busy: boolean;
  /** The authorize URL to show when a browser does not open automatically. */
  authorizeUrl: string | null;
  /** Non-null for the out-of-band flow while the user must paste a code. */
  sessionId: string | null;
  error: string | null;
  maskedKey: string | null;
  flow: OrcaConnectFlow;
  setFlow: (flow: OrcaConnectFlow) => void;
  start: () => Promise<void>;
  submitCode: (code: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

const POLL_INTERVAL_MS = 1000;

async function cancelServerSession(sessionId: string, keepalive: boolean) {
  const url = `/api/orcarouter/connect/session?sessionId=${encodeURIComponent(sessionId)}`;
  try {
    await fetch(url, { method: "DELETE", keepalive });
  } catch {
    // Cancellation is best effort; the server also expires sessions on a timer.
  }
}

/**
 * Drives the OrcaRouter PKCE login from the browser.
 *
 * The verifier and the loopback listener live on the server, so this hook only
 * relays status. It owns the UI half of the login lock: every terminal path and
 * every way of leaving the page must clear `busy` and the authorization hint.
 */
export function useOrcaConnect(): UseOrcaConnectReturn {
  const [status, setStatus] = useState<OrcaConnectStatus>("idle");
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [flow, setFlowState] = useState<OrcaConnectFlow>("loopback");

  // Monotonic attempt id. Every async response must confirm it still belongs to
  // the current generation before it touches state, so a late URL or success
  // from a superseded login can never appear under a newer one.
  const generationRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /** Clear UI state without touching the server. */
  const clearUi = useCallback(() => {
    clearPoll();
    setStatus("idle");
    setAuthorizeUrl(null);
    setSessionId(null);
    sessionIdRef.current = null;
  }, [clearPoll]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    const pending = sessionIdRef.current;
    clearUi();
    setError(null);
    if (pending) void cancelServerSession(pending, false);
  }, [clearUi]);

  const reset = useCallback(() => {
    cancel();
    setMaskedKey(null);
  }, [cancel]);

  const setFlow = useCallback(
    (next: OrcaConnectFlow) => {
      // Switching authentication method releases the in-flight login.
      if (next !== flow) {
        cancel();
        setFlowState(next);
      }
    },
    [cancel, flow],
  );

  const poll = useCallback(
    (id: string, generation: number) => {
      const tick = async () => {
        if (generation !== generationRef.current) return;
        let session: OrcaConnectSessionView;
        try {
          const response = await fetch(
            `/api/orcarouter/connect/session?sessionId=${encodeURIComponent(id)}`,
            { cache: "no-store" },
          );
          if (generation !== generationRef.current) return;
          if (!response.ok) {
            setStatus("error");
            setError("The OrcaRouter login session could not be read.");
            return;
          }
          session = (await response.json()) as OrcaConnectSessionView;
        } catch {
          if (generation !== generationRef.current) return;
          setStatus("error");
          setError("Lost contact with the OrcaRouter login session.");
          return;
        }
        if (generation !== generationRef.current) return;

        setStatus(session.status);
        setAuthorizeUrl(session.authorizeUrl);
        if (session.message)
          setError(session.status === "connected" ? null : session.message);
        if (session.maskedKey) setMaskedKey(session.maskedKey);

        if (
          session.status === "connected" ||
          session.status === "error" ||
          session.status === "cancelled" ||
          session.status === "expired"
        ) {
          clearPoll();
          sessionIdRef.current = null;
          setSessionId(null);
          return;
        }
        pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      };
      void tick();
    },
    [clearPoll],
  );

  const start = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    clearPoll();
    setError(null);
    setStatus("starting");
    setAuthorizeUrl(null);

    try {
      const response = await fetch("/api/orcarouter/connect/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow }),
      });
      if (generation !== generationRef.current) return;
      if (!response.ok) {
        setStatus("error");
        setError("The OrcaRouter login could not be started.");
        return;
      }
      const session = (await response.json()) as OrcaConnectSessionView;
      if (generation !== generationRef.current) {
        // A newer attempt owns the UI now; release the one we just created.
        void cancelServerSession(session.sessionId, false);
        return;
      }
      sessionIdRef.current = session.sessionId;
      setSessionId(session.sessionId);
      setAuthorizeUrl(session.authorizeUrl);
      setStatus(session.status);
      if (session.flow === "loopback") {
        // The server returns a loopback URL the local browser can open.
        if (session.callbackUrl)
          window.open(session.authorizeUrl, "_blank", "noopener");
      }
      poll(session.sessionId, generation);
    } catch {
      if (generation !== generationRef.current) return;
      setStatus("error");
      setError("The OrcaRouter login could not be started.");
    }
  }, [clearPoll, flow, poll]);

  const submitCode = useCallback(
    async (code: string) => {
      const id = sessionIdRef.current;
      if (!id) return;
      const generation = generationRef.current;
      setStatus("exchanging");
      try {
        const response = await fetch("/api/orcarouter/connect/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id, code }),
        });
        if (generation !== generationRef.current) return;
        if (!response.ok) {
          setStatus("error");
          setError("The OrcaRouter authorization code could not be submitted.");
          return;
        }
        const session = (await response.json()) as OrcaConnectSessionView;
        if (generation !== generationRef.current) return;
        setStatus(session.status);
        if (session.status === "connected") {
          clearPoll();
          sessionIdRef.current = null;
          setSessionId(null);
          if (session.maskedKey) setMaskedKey(session.maskedKey);
          setError(null);
          return;
        }
        if (session.message) setError(session.message);
      } catch {
        if (generation !== generationRef.current) return;
        setStatus("error");
        setError("The OrcaRouter authorization code could not be submitted.");
      }
    },
    [clearPoll],
  );

  // A page entering the back-forward cache is never unmounted, so a guarded
  // `finally` would leave it permanently busy. Invalidate the generation and
  // clear the busy flag and hint synchronously, then ask the server to cancel.
  useEffect(() => {
    const onPageHide = () => {
      generationRef.current += 1;
      clearPoll();
      setStatus("idle");
      setAuthorizeUrl(null);
      setSessionId(null);
      setError(null);
      const pending = sessionIdRef.current;
      sessionIdRef.current = null;
      if (pending) {
        const url = `/api/orcarouter/connect/session?sessionId=${encodeURIComponent(pending)}`;
        try {
          void fetch(url, { method: "DELETE", keepalive: true });
        } catch {
          // Best effort.
        }
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [clearPoll]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      const pending = sessionIdRef.current;
      sessionIdRef.current = null;
      // Cancel the server work without writing component state on unmount.
      if (pending) void cancelServerSession(pending, false);
    };
  }, []);

  return {
    status,
    busy:
      status === "starting" ||
      status === "pending" ||
      status === "awaiting_code" ||
      status === "exchanging",
    authorizeUrl,
    sessionId,
    error,
    maskedKey,
    flow,
    setFlow,
    start,
    submitCode,
    cancel,
    reset,
  };
}

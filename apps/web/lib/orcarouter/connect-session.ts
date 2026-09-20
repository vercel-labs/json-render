/**
 * Server-side OrcaRouter connect sessions.
 *
 * A login is owned by the server process, not the browser: the PKCE verifier
 * never leaves it, and the loopback listener that receives the auth code lives
 * here. The browser only learns the authorize URL and the session status.
 *
 * Every terminal path — success, denial, exchange error, timeout, explicit
 * cancel, switching method, unmount, reload and `pagehide` — releases the
 * listener and the single in-flight login lock.
 */

import { createServer, type Server } from "node:http";
import {
  OrcaAuthError,
  createOrcaPkceAttempt,
  buildOrcaAuthorizeUrl,
  constantTimeEqual,
  exchangeOrcaAuthCode,
  fetchOrcaCatalog,
  orcarouterSeedCatalog,
  type OrcaCatalog,
  type OrcaPkceAttempt,
  type OrcarouterOrigins,
} from "@json-render/core";
import { getOrcaServerState, saveOrcaCredential } from "./server-store";

export type OrcaConnectFlow = "loopback" | "oob";

export type OrcaConnectStatus =
  | "pending"
  | "awaiting_code"
  | "exchanging"
  | "connected"
  | "error"
  | "cancelled"
  | "expired";

export interface OrcaConnectSessionView {
  readonly sessionId: string;
  readonly flow: OrcaConnectFlow;
  readonly status: OrcaConnectStatus;
  /** Safe to display: it carries only the challenge, never the verifier. */
  readonly authorizeUrl: string;
  readonly callbackUrl: string | null;
  readonly expiresAt: string;
  /** User-facing message. Never contains a key, code or verifier. */
  readonly message: string | null;
  readonly maskedKey: string | null;
}

interface OrcaConnectSession {
  id: string;
  flow: OrcaConnectFlow;
  status: OrcaConnectStatus;
  attempt: OrcaPkceAttempt;
  authorizeUrl: string;
  callbackUrl: string | null;
  expiresAt: number;
  message: string | null;
  maskedKey: string | null;
  server: Server | null;
  timer: ReturnType<typeof setTimeout> | null;
}

/** The auth code is single-use with a 10 minute TTL; match that window. */
export const CONNECT_SESSION_TTL_MS = 10 * 60 * 1000;
const APP_NAME = "json-render";

interface ConnectRegistry {
  sessions: Map<string, OrcaConnectSession>;
  activeSessionId: string | null;
}

const registryHost = globalThis as unknown as {
  __jsonRenderOrcaConnect?: ConnectRegistry;
};

function registry(): ConnectRegistry {
  if (!registryHost.__jsonRenderOrcaConnect) {
    registryHost.__jsonRenderOrcaConnect = {
      sessions: new Map(),
      activeSessionId: null,
    };
  }
  return registryHost.__jsonRenderOrcaConnect;
}

function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 8)}••••${trimmed.slice(-4)}`;
}

function view(session: OrcaConnectSession): OrcaConnectSessionView {
  return {
    sessionId: session.id,
    flow: session.flow,
    status: session.status,
    authorizeUrl: session.authorizeUrl,
    callbackUrl: session.callbackUrl,
    expiresAt: new Date(session.expiresAt).toISOString(),
    message: session.message,
    maskedKey: session.maskedKey,
  };
}

function closeListener(session: OrcaConnectSession): void {
  if (session.server) {
    try {
      session.server.close();
    } catch {
      // Already closed.
    }
    session.server = null;
  }
}

function finish(
  session: OrcaConnectSession,
  status: OrcaConnectStatus,
  message: string | null,
): void {
  session.status = status;
  session.message = message;
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }
  closeListener(session);
  const active = registry();
  if (active.activeSessionId === session.id) {
    active.activeSessionId = null;
  }
}

/** Terminal sessions are kept briefly so a late poll can observe the outcome. */
const TERMINAL_SESSION_RETENTION_MS = 60_000;
const MAX_RETAINED_SESSIONS = 20;

function pruneSessions(): void {
  const active = registry();
  const now = Date.now();
  for (const [id, session] of active.sessions) {
    const terminal =
      session.status !== "pending" &&
      session.status !== "awaiting_code" &&
      session.status !== "exchanging";
    if (terminal && now - session.expiresAt > TERMINAL_SESSION_RETENTION_MS) {
      active.sessions.delete(id);
    }
  }
  if (active.sessions.size > MAX_RETAINED_SESSIONS) {
    const excess = [...active.sessions.keys()].slice(
      0,
      active.sessions.size - MAX_RETAINED_SESSIONS,
    );
    for (const id of excess) {
      if (id === active.activeSessionId) continue;
      active.sessions.delete(id);
    }
  }
}

/** Release every session. Used on a new login, unmount and `pagehide`. */
export function cancelOrcaConnectSession(sessionId?: string): number {
  const active = registry();
  const targets = sessionId
    ? ([active.sessions.get(sessionId)].filter(Boolean) as OrcaConnectSession[])
    : [...active.sessions.values()];
  let cancelled = 0;
  for (const session of targets) {
    if (session.status === "connected") continue;
    // The record is kept so a poll already in flight still observes the
    // terminal status instead of a 404 it would have to guess about.
    finish(
      session,
      "cancelled",
      session.message ?? "OrcaRouter authorization was cancelled.",
    );
    cancelled += 1;
  }
  if (!sessionId || active.activeSessionId === sessionId) {
    active.activeSessionId = null;
  }
  pruneSessions();
  return cancelled;
}

export function getOrcaConnectSession(
  sessionId: string,
): OrcaConnectSessionView | null {
  const session = registry().sessions.get(sessionId);
  if (!session) return null;
  const inFlight =
    session.status === "pending" ||
    session.status === "awaiting_code" ||
    session.status === "exchanging";
  if (inFlight && Date.now() >= session.expiresAt) {
    finish(
      session,
      "expired",
      "OrcaRouter authorization timed out. Start again to get a new code.",
    );
  }
  return view(session);
}

async function completeExchange(
  session: OrcaConnectSession,
  code: string,
  origins: OrcarouterOrigins,
): Promise<void> {
  // Only the newest login may install a credential. A late success from a
  // superseded session must not overwrite a newer credential.
  if (registry().activeSessionId !== session.id) {
    finish(session, "cancelled", "A newer OrcaRouter login replaced this one.");
    return;
  }
  session.status = "exchanging";
  try {
    const result = await exchangeOrcaAuthCode({
      origins,
      code,
      attempt: session.attempt,
    });
    if (registry().activeSessionId !== session.id) {
      finish(
        session,
        "cancelled",
        "A newer OrcaRouter login replaced this one.",
      );
      return;
    }
    await saveOrcaCredential({
      apiKey: result.key,
      method: "orcarouter-oauth",
      grantedScope: result.grantedScope,
      accountId: result.userId,
    });
    session.maskedKey = maskKey(result.key);
    finish(session, "connected", "Connected to OrcaRouter.");
  } catch (error) {
    const message =
      error instanceof OrcaAuthError
        ? error.message
        : "OrcaRouter authorization failed. Try again.";
    finish(session, "error", message);
  }
}

export interface StartOrcaConnectOptions {
  readonly flow: OrcaConnectFlow;
  /** `pagehide`/unmount cancel the previous session before starting a new one. */
  readonly replaceActive?: boolean;
}

export async function startOrcaConnectSession(
  options: StartOrcaConnectOptions,
): Promise<OrcaConnectSessionView> {
  const { origins } = getOrcaServerState();
  if (options.replaceActive !== false) cancelOrcaConnectSession();

  const attempt = await createOrcaPkceAttempt();
  const session: OrcaConnectSession = {
    id: globalThis.crypto.randomUUID(),
    flow: options.flow,
    status: "pending",
    attempt,
    authorizeUrl: "",
    callbackUrl: null,
    expiresAt: Date.now() + CONNECT_SESSION_TTL_MS,
    message: null,
    maskedKey: null,
    server: null,
    timer: null,
  };

  if (options.flow === "loopback") {
    let settle: ((code: string) => void) | null = null;
    const codePromise = new Promise<string>((resolve) => {
      settle = resolve;
    });
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/cb") {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        "<!doctype html><meta charset=utf-8><title>OrcaRouter</title><p>Connected to OrcaRouter. You can close this tab.",
      );

      const receivedState = url.searchParams.get("state");
      const receivedError = url.searchParams.get("error");
      // The state check is the only thing between this listener and a code
      // somebody else's page dropped on it. Compare it first, in constant time.
      if (
        receivedState === null ||
        !constantTimeEqual(receivedState, session.attempt.state)
      ) {
        finish(
          session,
          "error",
          "The OrcaRouter authorization response did not match this request. Nothing was stored.",
        );
        return;
      }
      if (receivedError) {
        finish(
          session,
          "error",
          `OrcaRouter authorization was declined (${receivedError}).`,
        );
        return;
      }
      const code = url.searchParams.get("code");
      if (!code) {
        finish(
          session,
          "error",
          "The OrcaRouter authorization response did not include a code.",
        );
        return;
      }
      session.status = "awaiting_code";
      settle?.(code);
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    session.server = server;
    session.callbackUrl = `http://127.0.0.1:${port}/cb`;

    void codePromise.then((code) => {
      if (session.status === "cancelled" || session.status === "expired")
        return;
      void completeExchange(session, code, origins);
    });
  } else {
    session.status = "awaiting_code";
    session.callbackUrl = "oob";
  }

  session.authorizeUrl = buildOrcaAuthorizeUrl({
    origins,
    callbackUrl: session.callbackUrl ?? "oob",
    attempt,
    appName: APP_NAME,
  });

  session.timer = setTimeout(() => {
    if (session.status === "connected") return;
    finish(
      session,
      "expired",
      "OrcaRouter authorization timed out. Start again to get a new code.",
    );
  }, CONNECT_SESSION_TTL_MS);

  const active = registry();
  active.sessions.set(session.id, session);
  active.activeSessionId = session.id;
  return view(session);
}

/** Out-of-band completion: the user pasted the displayed code. */
export async function submitOrcaConnectCode(
  sessionId: string,
  code: string,
): Promise<OrcaConnectSessionView | null> {
  const session = registry().sessions.get(sessionId);
  if (!session) return null;
  if (session.status === "connected") return view(session);
  if (session.status === "cancelled" || session.status === "expired") {
    return view(session);
  }
  const trimmed = code?.trim() ?? "";
  if (!trimmed) {
    finish(session, "error", "Enter the code shown on the OrcaRouter page.");
    return view(session);
  }
  const { origins } = getOrcaServerState();
  await completeExchange(session, trimmed, origins);
  return view(session);
}

/** Test seam: drop all sessions and listeners. */
export function resetOrcaConnectSessions(): void {
  const active = registry();
  for (const session of active.sessions.values()) {
    if (session.timer) clearTimeout(session.timer);
    closeListener(session);
  }
  active.sessions.clear();
  active.activeSessionId = null;
}

export interface OrcaModelDiscoveryResult {
  readonly catalog: OrcaCatalog;
  readonly maskedKey: string | null;
}

/**
 * Discover models through the provider code path. Live discovery is
 * authoritative; on failure the verified seed is returned and flagged
 * degraded. A failed discovery never falls back to free-text entry.
 */
export async function discoverOrcaModels(): Promise<OrcaModelDiscoveryResult> {
  const { store, origins } = getOrcaServerState();
  const credential = store.getUsableCredential();
  if (!credential) {
    return {
      catalog: orcarouterSeedCatalog(
        "Connect to OrcaRouter to list the models your account can call.",
      ),
      maskedKey: null,
    };
  }
  try {
    const catalog = await fetchOrcaCatalog({
      origins,
      apiKey: credential.apiKey,
      capability: "chat",
    });
    return { catalog, maskedKey: maskKey(credential.apiKey) };
  } catch (error) {
    if (
      error instanceof OrcaAuthError ||
      (typeof error === "object" &&
        error !== null &&
        (error as { status?: number }).status === 401)
    ) {
      store.recordInferenceStatus(
        credential.accountId,
        credential.generation,
        401,
      );
    }
    return {
      catalog: orcarouterSeedCatalog(
        error instanceof Error
          ? error.message
          : "The OrcaRouter model catalog is unavailable.",
      ),
      maskedKey: maskKey(credential.apiKey),
    };
  }
}

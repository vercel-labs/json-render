import {
  cancelOrcaConnectSession,
  getOrcaConnectSession,
  startOrcaConnectSession,
  submitOrcaConnectCode,
  type OrcaConnectFlow,
} from "@/lib/orcarouter/connect-session";

export const maxDuration = 60;

/**
 * The OAuth 2.0 + PKCE connect flow. The verifier and the loopback listener
 * stay in this process; the browser receives only the authorize URL and a
 * status. Every terminal path releases the single in-flight login.
 */

/** Start a login. Replaces any previous in-flight session. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    flow?: OrcaConnectFlow;
  };
  const flow: OrcaConnectFlow = body.flow === "loopback" ? "loopback" : "oob";
  const session = await startOrcaConnectSession({ flow });
  return Response.json(session);
}

/** Poll a login's status. */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }
  const session = getOrcaConnectSession(sessionId);
  if (!session) {
    return Response.json({ error: "Unknown session" }, { status: 404 });
  }
  return Response.json(session);
}

/** Complete an out-of-band login, or cancel a login explicitly. */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    code?: string;
  };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }
  const session = await submitOrcaConnectCode(body.sessionId, body.code ?? "");
  if (!session) {
    return Response.json({ error: "Unknown session" }, { status: 404 });
  }
  return Response.json(session);
}

/** Cancel. Called on cancel, method switch, unmount, reload and `pagehide`. */
export async function DELETE(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  const cancelled = cancelOrcaConnectSession(sessionId ?? undefined);
  return Response.json({ ok: true, cancelled });
}

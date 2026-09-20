import { redactOrcaApiKey } from "@json-render/core";
import {
  getOrcaServerState,
  clearOrcaCredential,
} from "@/lib/orcarouter/server-store";

export const maxDuration = 15;

/** Current connection state. The key itself never leaves the server. */
export async function GET() {
  const { store, persistence, origins } = getOrcaServerState();
  const credential = store.getCredential();
  return Response.json({
    connected: store.isConnected(),
    needsReauth: store.needsReauth,
    method: credential?.method ?? null,
    maskedKey: credential ? redactOrcaApiKey(credential.apiKey) : null,
    reauthReason: credential?.reauthReason ?? null,
    persisted: persistence.persisted,
    location: persistence.location,
    notice: persistence.problem,
    authOrigin: origins.authBaseUrl,
    apiOrigin: origins.apiBaseUrl,
  });
}

/** Remove the credential from memory and from the env file. */
export async function DELETE() {
  await clearOrcaCredential();
  return Response.json({ ok: true, connected: false });
}

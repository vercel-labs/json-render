/**
 * Generation-safe credential store for OrcaRouter.
 *
 * The store holds whatever credential the active source produced. It is
 * deliberately storage-agnostic: callers persist the serialized form wherever
 * their deployment already keeps secrets. Nothing here writes a side file or
 * introduces a new secret store.
 */

import {
  classifyOrcaInferenceFailure,
  type OrcaCredentialMethod,
  type OrcaCredentialResult,
  type OrcaStoredCredential,
} from "./credential";

export interface OrcaCredentialStoreSnapshot {
  readonly credential: OrcaStoredCredential | null;
}

export class OrcaCredentialStore {
  private current: OrcaStoredCredential | null;
  private generation = 0;

  constructor(initial: OrcaStoredCredential | null = null) {
    this.current = initial;
    this.generation = initial?.generation ?? 0;
  }

  /**
   * Install a credential from either source. Bumps the generation so a late
   * failure from a request made with the previous credential cannot mark this
   * one as broken.
   */
  setCredential(result: OrcaCredentialResult): OrcaStoredCredential {
    this.generation += 1;
    const stored: OrcaStoredCredential = {
      apiKey: result.apiKey,
      method: result.method,
      grantedScope: result.grantedScope,
      accountId: result.accountId,
      generation: this.generation,
      status: "active",
      issuedAt: new Date().toISOString(),
      reauthReason: null,
    };
    this.current = stored;
    return stored;
  }

  getCredential(): OrcaStoredCredential | null {
    return this.current;
  }

  /** The credential to send, or null when the account needs reauthentication. */
  getUsableCredential(): OrcaStoredCredential | null {
    return this.current?.status === "active" ? this.current : null;
  }

  isConnected(): boolean {
    return this.getUsableCredential() !== null;
  }

  get needsReauth(): boolean {
    return this.current?.status === "needs_reauth";
  }

  /**
   * Mark the credential that made a rejected request as needing
   * reauthentication.
   *
   * Only the exact account and credential generation that made the request is
   * touched: a late `401` from a request issued before a re-login leaves the
   * new credential active. The stored secret is kept so the user can retry
   * without losing the account.
   */
  markNeedsReauth(
    accountId: string | null,
    generation: number,
    reason: string,
  ): boolean {
    const credential = this.current;
    if (!credential) return false;
    if (credential.generation !== generation) return false;
    if (credential.accountId !== accountId) return false;
    this.current = {
      ...credential,
      status: "needs_reauth",
      reauthReason: reason,
    };
    return true;
  }

  /**
   * Record an inference failure against the credential that made the request.
   * Non-terminal statuses leave the credential untouched.
   */
  recordInferenceStatus(
    accountId: string | null,
    generation: number,
    status: number,
  ): boolean {
    const classification = classifyOrcaInferenceFailure(status);
    if (!classification.terminal || !classification.reason) return false;
    return this.markNeedsReauth(accountId, generation, classification.reason);
  }

  /** Remove the credential. The caller decides when the user asked for this. */
  clear(): void {
    this.current = null;
  }

  snapshot(): OrcaCredentialStoreSnapshot {
    return { credential: this.current };
  }
}

export interface SerializedOrcaCredentialStore {
  readonly version: 1;
  readonly credential: OrcaStoredCredential | null;
}

/**
 * Serialize for persistence. Callers must write the result wherever the
 * deployment already stores secrets; it is not encrypted here.
 */
export function serializeOrcaCredentialStore(
  store: OrcaCredentialStore,
): SerializedOrcaCredentialStore {
  return { version: 1, credential: store.snapshot().credential };
}

export function deserializeOrcaCredentialStore(
  value: unknown,
): OrcaCredentialStore {
  if (typeof value !== "object" || value === null) {
    return new OrcaCredentialStore(null);
  }
  const record = value as Record<string, unknown>;
  const raw = record.credential;
  if (typeof raw !== "object" || raw === null) {
    return new OrcaCredentialStore(null);
  }
  const candidate = raw as Record<string, unknown>;
  const apiKey = candidate.apiKey;
  const generation = candidate.generation;
  if (
    typeof apiKey !== "string" ||
    !apiKey ||
    typeof generation !== "number" ||
    !Number.isSafeInteger(generation) ||
    generation < 0
  ) {
    return new OrcaCredentialStore(null);
  }
  const method: OrcaCredentialMethod =
    candidate.method === "orcarouter-oauth" ? "orcarouter-oauth" : "api_key";
  return new OrcaCredentialStore({
    apiKey,
    method,
    grantedScope:
      typeof candidate.grantedScope === "string"
        ? candidate.grantedScope
        : null,
    accountId:
      typeof candidate.accountId === "string" ? candidate.accountId : null,
    generation,
    status: candidate.status === "needs_reauth" ? "needs_reauth" : "active",
    issuedAt:
      typeof candidate.issuedAt === "string"
        ? candidate.issuedAt
        : new Date(0).toISOString(),
    reauthReason:
      typeof candidate.reauthReason === "string"
        ? candidate.reauthReason
        : null,
  });
}

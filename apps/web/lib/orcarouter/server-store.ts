/**
 * Server-side OrcaRouter credential persistence.
 *
 * json-render keeps provider secrets in the Next.js env files it already uses
 * (`apps/web/.env.local`, ignored by `.gitignore`). This module reuses that
 * mechanism rather than introducing a second credential store: a key obtained
 * from either entry point is written to the same place a hand-configured
 * `ORCAROUTER_API_KEY` would live, so a restart reuses it instead of asking the
 * user to authorize again.
 *
 * When the filesystem is read-only (a hosted deployment), the credential is
 * kept for the lifetime of the process and persistence is reported as
 * unavailable instead of failing the login.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  OrcaCredentialStore,
  resolveOrcarouterOriginsFromEnv,
  type OrcaCredentialResult,
  type OrcarouterOrigins,
} from "@json-render/core";

const ENV_KEY = "ORCAROUTER_API_KEY";

export interface OrcaPersistenceStatus {
  readonly persisted: boolean;
  /** Where the credential was written, relative to the app root. */
  readonly location: string | null;
  /** Why persistence was skipped. Never contains the key. */
  readonly problem: string | null;
}

export interface OrcaServerState {
  store: OrcaCredentialStore;
  origins: OrcarouterOrigins;
  persistence: OrcaPersistenceStatus;
}

/**
 * The env file this app already uses for provider secrets. `ORCAROUTER_ENV_FILE`
 * lets a deployment point at a writable location, and lets tests use a
 * per-suite path instead of the shared project file.
 */
function appEnvFile(): string {
  return (
    process.env.ORCAROUTER_ENV_FILE?.trim() || join(process.cwd(), ".env.local")
  );
}

/** Replace or insert one key, leaving every other line untouched. */
export function upsertEnvLine(
  source: string,
  key: string,
  value: string | null,
): string {
  const lines = source.split("\n");
  const kept: string[] = [];
  let replaced = false;
  for (const line of lines) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match && match[1] === key) {
      if (!replaced && value !== null) {
        kept.push(`${key}=${value}`);
        replaced = true;
      }
      continue;
    }
    kept.push(line);
  }
  if (value !== null && !replaced) {
    const withoutTrailingBlanks = kept.join("\n").replace(/\n*$/, "");
    return `${withoutTrailingBlanks}${withoutTrailingBlanks ? "\n" : ""}${key}=${value}\n`;
  }
  return kept.join("\n");
}

async function writeEnvKey(
  value: string | null,
): Promise<OrcaPersistenceStatus> {
  const envFile = appEnvFile();
  try {
    let current = "";
    try {
      current = await readFile(envFile, "utf-8");
    } catch {
      current = "";
    }
    await writeFile(envFile, upsertEnvLine(current, ENV_KEY, value), {
      encoding: "utf-8",
      mode: 0o600,
    });
    return { persisted: true, location: envFile, problem: null };
  } catch {
    return {
      persisted: false,
      location: null,
      problem:
        "This deployment cannot write a local env file, so the key is only kept for the current process.",
    };
  }
}

function initialState(): OrcaServerState {
  const fromEnv = process.env[ENV_KEY]?.trim();
  const store = new OrcaCredentialStore();
  if (fromEnv) {
    store.setCredential({
      apiKey: fromEnv,
      method: "api_key",
      grantedScope: null,
      accountId: null,
    });
  }
  return {
    store,
    origins: resolveOrcarouterOriginsFromEnv(),
    persistence: { persisted: false, location: null, problem: null },
  };
}

// Survives Next.js dev-server module reloads.
const globalState = globalThis as unknown as {
  __jsonRenderOrcaState?: OrcaServerState;
};

export function getOrcaServerState(): OrcaServerState {
  if (!globalState.__jsonRenderOrcaState) {
    globalState.__jsonRenderOrcaState = initialState();
  }
  return globalState.__jsonRenderOrcaState;
}

/** Install a credential from either entry point and persist it. */
export async function saveOrcaCredential(
  result: OrcaCredentialResult,
): Promise<OrcaPersistenceStatus> {
  const state = getOrcaServerState();
  state.store.setCredential(result);
  state.persistence = await writeEnvKey(result.apiKey);
  return state.persistence;
}

/** Remove the credential from memory and from the env file. */
export async function clearOrcaCredential(): Promise<void> {
  const state = getOrcaServerState();
  state.store.clear();
  state.persistence = await writeEnvKey(null);
}

/** Test seam: reset the process-wide state between cases. */
export function resetOrcaServerState(): void {
  globalState.__jsonRenderOrcaState = undefined;
}

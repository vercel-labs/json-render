// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  clearOrcaCredential,
  getOrcaServerState,
  resetOrcaServerState,
  saveOrcaCredential,
  upsertEnvLine,
} from "./server-store";

/** A per-suite env file so parallel suites never share project state. */
const ENV_FILE = join(
  process.cwd(),
  `.orca-test-env-${process.pid}-server-store-test-ts`,
);
process.env.ORCAROUTER_ENV_FILE = ENV_FILE;
const originalEnv = process.env.ORCAROUTER_API_KEY;

async function restoreEnvFile(previous: string | null) {
  if (previous === null) {
    await rm(ENV_FILE, { force: true, recursive: true });
  } else {
    await writeFile(ENV_FILE, previous, "utf-8");
  }
}

describe("upsertEnvLine", () => {
  it("inserts a new key into an existing file", () => {
    const result = upsertEnvLine(
      "A=1\nB=2\n",
      "ORCAROUTER_API_KEY",
      "sk-orca-x",
    );
    expect(result).toBe("A=1\nB=2\nORCAROUTER_API_KEY=sk-orca-x\n");
  });

  it("replaces an existing key in place without touching other lines", () => {
    const result = upsertEnvLine(
      "# comment\nA=1\nORCAROUTER_API_KEY=old\nB=2\n",
      "ORCAROUTER_API_KEY",
      "new",
    );
    expect(result).toBe("# comment\nA=1\nORCAROUTER_API_KEY=new\nB=2\n");
  });

  it("removes the key and collapses duplicates", () => {
    const result = upsertEnvLine(
      "A=1\nORCAROUTER_API_KEY=one\nORCAROUTER_API_KEY=two\nB=2\n",
      "ORCAROUTER_API_KEY",
      null,
    );
    expect(result).not.toContain("ORCAROUTER_API_KEY");
    expect(result).toContain("A=1");
    expect(result).toContain("B=2");
  });

  it("does not match a key that merely shares a prefix", () => {
    const result = upsertEnvLine(
      "ORCAROUTER_API_KEY_BACKUP=keep\n",
      "ORCAROUTER_API_KEY",
      "new",
    );
    expect(result).toContain("ORCAROUTER_API_KEY_BACKUP=keep");
    expect(result).toContain("ORCAROUTER_API_KEY=new");
  });

  it("creates a single line for an empty file", () => {
    expect(upsertEnvLine("", "ORCAROUTER_API_KEY", "sk-orca-x")).toBe(
      "ORCAROUTER_API_KEY=sk-orca-x\n",
    );
  });
});

describe("server credential store", () => {
  let previousEnvFile: string | null = null;

  beforeEach(async () => {
    try {
      previousEnvFile = await readFile(ENV_FILE, "utf-8");
    } catch {
      previousEnvFile = null;
    }
    delete process.env.ORCAROUTER_API_KEY;
    resetOrcaServerState();
  });

  afterEach(async () => {
    resetOrcaServerState();
    await restoreEnvFile(previousEnvFile);
    if (originalEnv === undefined) delete process.env.ORCAROUTER_API_KEY;
    else process.env.ORCAROUTER_API_KEY = originalEnv;
  });

  it("starts disconnected when no key is configured", () => {
    const state = getOrcaServerState();
    expect(state.store.isConnected()).toBe(false);
    expect(state.origins.authBaseUrl).toBe("https://www.orcarouter.ai");
    expect(state.origins.apiBaseUrl).toBe("https://api.orcarouter.ai");
  });

  it("adopts an env-configured key without starting a login", () => {
    process.env.ORCAROUTER_API_KEY = "sk-orca-from-env";
    resetOrcaServerState();
    const credential = getOrcaServerState().store.getCredential();
    expect(credential?.apiKey).toBe("sk-orca-from-env");
    expect(credential?.method).toBe("api_key");
  });

  it("persists a PKCE-issued credential with the project's env mechanism", async () => {
    const status = await saveOrcaCredential({
      apiKey: "sk-orca-from-pkce",
      method: "orcarouter-oauth",
      grantedScope: "api",
      accountId: "u-1",
    });
    expect(status.persisted).toBe(true);
    expect(status.location).toBe(ENV_FILE);
    const written = await readFile(ENV_FILE, "utf-8");
    expect(written).toContain("ORCAROUTER_API_KEY=sk-orca-from-pkce");
    expect(getOrcaServerState().store.getCredential()?.method).toBe(
      "orcarouter-oauth",
    );
  });

  it("keeps a previously configured unrelated key intact when saving", async () => {
    await writeFile(ENV_FILE, "AI_GATEWAY_API_KEY=keep-me\n", "utf-8");
    await saveOrcaCredential({
      apiKey: "sk-orca-new",
      method: "api_key",
      grantedScope: null,
      accountId: null,
    });
    const written = await readFile(ENV_FILE, "utf-8");
    expect(written).toContain("AI_GATEWAY_API_KEY=keep-me");
    expect(written).toContain("ORCAROUTER_API_KEY=sk-orca-new");
  });

  it("clears both memory and the env file on disconnect", async () => {
    await saveOrcaCredential({
      apiKey: "sk-orca-doomed",
      method: "api_key",
      grantedScope: null,
      accountId: null,
    });
    await clearOrcaCredential();
    expect(getOrcaServerState().store.getCredential()).toBeNull();
    const written = await readFile(ENV_FILE, "utf-8").catch(() => "");
    expect(written).not.toContain("sk-orca-doomed");
  });

  it("reuses the stored key across a restart instead of re-authorizing", async () => {
    await saveOrcaCredential({
      apiKey: "sk-orca-durable",
      method: "orcarouter-oauth",
      grantedScope: "api",
      accountId: "u-1",
    });
    // Simulate a restart: the in-memory store is dropped, the file is not.
    resetOrcaServerState();
    process.env.ORCAROUTER_API_KEY = "sk-orca-durable";
    resetOrcaServerState();
    expect(getOrcaServerState().store.getCredential()?.apiKey).toBe(
      "sk-orca-durable",
    );
  });

  it("resolves overrides from the environment", () => {
    process.env.ORCA_AUTH_BASE_URL = "https://auth.example";
    process.env.ORCA_API_BASE_URL = "https://relay.example";
    resetOrcaServerState();
    const state = getOrcaServerState();
    expect(state.origins.authBaseUrl).toBe("https://auth.example");
    expect(state.origins.apiBaseUrl).toBe("https://relay.example");
    delete process.env.ORCA_AUTH_BASE_URL;
    delete process.env.ORCA_API_BASE_URL;
  });

  it("never reports the key through the persistence status", async () => {
    const status = await saveOrcaCredential({
      apiKey: "sk-orca-should-not-appear",
      method: "api_key",
      grantedScope: null,
      accountId: null,
    });
    expect(JSON.stringify(status)).not.toContain("sk-orca-should-not-appear");
  });

  it("does not throw when the env file cannot be written", async () => {
    // A directory at the env-file path makes the write fail without mocking
    // ESM module internals.
    await rm(ENV_FILE, { force: true, recursive: true });
    await mkdir(ENV_FILE, { recursive: true });
    try {
      const status = await saveOrcaCredential({
        apiKey: "sk-orca-readonly",
        method: "api_key",
        grantedScope: null,
        accountId: null,
      });
      expect(status.persisted).toBe(false);
      expect(status.problem).toBeTruthy();
      expect(JSON.stringify(status)).not.toContain("sk-orca-readonly");
      // The credential is still usable for this process.
      expect(getOrcaServerState().store.isConnected()).toBe(true);
    } finally {
      await rm(ENV_FILE, { force: true, recursive: true });
    }
  });
});

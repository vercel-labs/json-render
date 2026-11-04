// @vitest-environment node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "tsup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isProduction } from "./prod-guard";

async function bundleGuard(nodeEnv: string, minify: boolean): Promise<string> {
  const outDir = await mkdtemp(join(tmpdir(), "json-render-prod-guard-"));
  try {
    await build({
      entry: {
        guard: fileURLToPath(new URL("./prod-guard.ts", import.meta.url)),
      },
      format: ["iife"],
      platform: "browser",
      globalName: "guard",
      outDir,
      outExtension: () => ({ js: ".js" }),
      config: false,
      dts: false,
      silent: true,
      minify,
      replaceNodeEnv: false,
      define: { "process.env.NODE_ENV": JSON.stringify(nodeEnv) },
    });
    return await readFile(join(outDir, "guard.js"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

describe("isProduction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns false when NODE_ENV is not production", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(isProduction()).toBe(false);
  });

  it("returns true when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProduction()).toBe(true);
  });

  it("returns false when NODE_ENV is undefined", () => {
    vi.stubEnv("NODE_ENV", undefined);
    expect(isProduction()).toBe(false);
  });

  it("returns false when there is no process global", () => {
    vi.stubGlobal("process", undefined);
    expect(isProduction()).toBe(false);
  });

  it.each([false, true])(
    "detects a production bundle without a process global (minify: %s)",
    async (minify) => {
      const code = await bundleGuard("production", minify);
      expect(runInNewContext(`${code}\nguard.isProduction()`, {})).toBe(true);
    },
  );

  it("keeps development bundles active without a process global", async () => {
    const code = await bundleGuard("development", true);
    expect(runInNewContext(`${code}\nguard.isProduction()`, {})).toBe(false);
  });
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "tsup";
import { isProduction } from "./prod-guard";

describe("isProduction", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    vi.unstubAllGlobals();
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  });

  it("returns false when NODE_ENV is not production", () => {
    process.env.NODE_ENV = "test";
    expect(isProduction()).toBe(false);
  });

  it("returns true when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    expect(isProduction()).toBe(true);
  });

  it("returns false when NODE_ENV is undefined", () => {
    delete process.env.NODE_ENV;
    expect(isProduction()).toBe(false);
  });

  it("returns false in an unbundled browser without process", () => {
    vi.stubGlobal("process", undefined);
    expect(isProduction()).toBe(false);
  });

  it("detects a production bundle without a browser process global", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "json-render-prod-guard-"));
    try {
      await build({
        entry: [fileURLToPath(new URL("./prod-guard.ts", import.meta.url))],
        outDir,
        format: ["cjs"],
        config: false,
        silent: true,
        define: { "process.env.NODE_ENV": '"production"' },
      });
      const source = await readFile(join(outDir, "prod-guard.js"), "utf8");
      expect(
        runInNewContext(`${source}\nmodule.exports.isProduction()`, {
          module: { exports: {} },
        }),
      ).toBe(true);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

#!/usr/bin/env node
/**
 * One reproducible entry point for verifying the OrcaRouter integration.
 *
 * The repository is a pnpm workspace, so every mode first makes sure the pinned
 * package manager is available, the workspace dependencies are installed, and
 * the `@json-render/*` packages are built; without the build, the web app and
 * the package tests cannot resolve `@json-render/core`. Each step is
 * idempotent, so only the first mode in a verification run pays for it.
 *
 *   node scripts/orca-verify.mjs install
 *   node scripts/orca-verify.mjs unit [paths...]
 *   node scripts/orca-verify.mjs check-types
 *   node scripts/orca-verify.mjs lint
 *   node scripts/orca-verify.mjs version
 *   node scripts/orca-verify.mjs ui-evidence
 *
 * `pnpm` is resolved from a workspace-local bootstrap, then from `PATH`, then
 * through `npx`, so this works in a minimal environment that only has Node.js.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PNPM_VERSION = "11.1.3";
const PNPM_BOOTSTRAP = path.join(root, "node_modules", ".orca-pnpm");
const BOOTSTRAPPED_PNPM = path.join(
  PNPM_BOOTSTRAP,
  "node_modules/pnpm/bin/pnpm.cjs",
);

function run(argv) {
  process.stdout.write(`\n$ ${argv.join(" ")}\n`);
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** The pnpm invocation for this environment. */
function pnpm() {
  if (existsSync(BOOTSTRAPPED_PNPM)) return [process.execPath, BOOTSTRAPPED_PNPM];
  return ["npx", "--yes", `pnpm@${PNPM_VERSION}`];
}

/**
 * The pinned package manager, installed into `node_modules/` (ignored) so the
 * workspace stays byte-identical. Corepack is not usable here: it resolves the
 * version over the network on every call and is not on `PATH` in a minimal
 * environment.
 */
function ensurePnpm() {
  if (existsSync(BOOTSTRAPPED_PNPM)) return;
  run([
    "npm",
    "install",
    "--prefix",
    PNPM_BOOTSTRAP,
    "--no-package-lock",
    `pnpm@${PNPM_VERSION}`,
  ]);
}

function ensure() {
  ensurePnpm();
  const command = pnpm();
  if (!existsSync(path.join(root, "node_modules", ".pnpm"))) {
    run([...command, "install", "--frozen-lockfile"]);
  }
  if (!existsSync(path.join(root, "packages", "core", "dist"))) {
    // turbo cannot find a package manager binary outside PATH, so build the
    // workspace packages with pnpm itself.
    run([...command, "-r", "--filter", "./packages/*", "run", "build"]);
  }
}

const [mode, ...rest] = process.argv.slice(2);
if (!mode) {
  process.stderr.write("usage: node scripts/orca-verify.mjs <mode> [args...]\n");
  process.exit(2);
}

if (mode === "install") {
  ensure();
  process.exit(0);
}

ensure();

switch (mode) {
  case "unit":
    run(["npx", "vitest", "run", ...rest]);
    break;
  case "node-test":
    run(["node", "--test", ...rest]);
    break;
  case "check-types":
    run([...pnpm(), "--filter", "web", "run", "check-types"]);
    break;
  case "lint":
    run([...pnpm(), "--filter", "web", "run", "lint"]);
    break;
  case "version":
    run(["node", "scripts/check-version-sync.js"]);
    break;
  case "ui-evidence":
    run(["python3", "scripts/orca-ui-evidence.py"]);
    break;
  default:
    process.stderr.write(`unknown mode: ${mode}\n`);
    process.exit(2);
}

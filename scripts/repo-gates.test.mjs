// @ts-check
/**
 * Regression test for the repository's own mandatory gates.
 *
 * `.github/workflows/ci.yml` runs `pnpm lint`, `pnpm type-check` and the
 * version-sync check on every pull request. Those gates are scripts rather than
 * test files, so this suite runs them through the repository's driver
 * (`scripts/orca-verify.mjs`) and fails with their output if any of them stops
 * passing.
 *
 *   node --test scripts/repo-gates.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const driver = path.join("scripts", "orca-verify.mjs");

function gate(mode) {
  return spawnSync(process.execPath, [driver, mode], {
    cwd: root,
    encoding: "utf-8",
  });
}

for (const [mode, label] of [
  ["version", "version:check"],
  ["lint", "lint"],
  ["check-types", "type-check"],
]) {
  test(`the repository's ${label} gate passes`, () => {
    const result = gate(mode);
    assert.equal(
      result.status,
      0,
      `${label} failed:\n${result.stdout}\n${result.stderr}`,
    );
  });
}

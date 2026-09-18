import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";

function resolveShiki(packageName) {
  const require = createRequire(import.meta.resolve(packageName));
  return realpathSync(require.resolve("shiki"));
}

assert.equal(
  resolveShiki("streamdown"),
  resolveShiki("@streamdown/code"),
  "Streamdown and its code plugin must resolve the same Shiki dependency",
);

console.log("Streamdown/Shiki dependency contract passed.");

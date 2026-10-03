// @ts-expect-error This package does not depend on @types/node.
import { readFileSync } from "node:fs";
// @ts-expect-error This package does not depend on @types/node.
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  // @ts-expect-error Vitest provides __dirname when running this file.
  readFileSync(join(__dirname, "../package.json"), "utf8"),
) as {
  peerDependencies: Record<string, string>;
};

describe("@json-render/react peerDependencies", () => {
  it("accepts React 18 and React 19", () => {
    expect(packageJson.peerDependencies.react).toBe("^18.0.0 || ^19.0.0");
    expect(packageJson.peerDependencies).not.toHaveProperty("react-dom");
  });
});

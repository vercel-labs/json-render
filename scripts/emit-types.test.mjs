import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emitTypes } from "./emit-types.mjs";

// A throwaway package whose only module does not type check, so tsc exits with status 1
// while still emitting a declaration for the module.
async function brokenPackage() {
  const packageDir = await mkdtemp(join(tmpdir(), "emit-types-"));
  await writeFile(
    join(packageDir, "tsconfig.build.json"),
    JSON.stringify({
      compilerOptions: {
        target: "es2022",
        module: "esnext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
        rootDir: "./src",
        outDir: "./.types",
        declaration: true,
        noEmit: false,
        emitDeclarationOnly: true,
      },
      include: ["src"],
    }),
  );
  await mkdir(join(packageDir, "src"));
  await writeFile(
    join(packageDir, "src", "index.ts"),
    'export const broken: number = "not a number";\n',
  );
  return packageDir;
}

describe("emitTypes", () => {
  it("fails the build when tsc reports a type error", async () => {
    const packageDir = await brokenPackage();
    await expect(emitTypes(packageDir)).rejects.toThrow();
  });

  it("keeps watching and still writes declarations when tsc reports a type error", async () => {
    const packageDir = await brokenPackage();
    await expect(
      emitTypes(packageDir, {
        watch: true,
        bundle: { entries: ["index"], resolve: [] },
      }),
    ).resolves.toBeUndefined();
    expect(
      await readFile(join(packageDir, "dist", "index.d.ts"), "utf8"),
    ).toContain("declare const broken");
  });
});

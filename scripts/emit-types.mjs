// Writes a package's declaration files with tsc and its tsconfig.build.json. tsup's own `dts`
// option needs the TypeScript 6 API, so tsup configs call this from `onSuccess` instead, which
// runs after every build, including each rebuild in watch mode.
//
// With `bundle`, tsc writes to .types and the entries are bundled into dist with
// rolldown-plugin-dts, inlining the types of the listed private packages (and no others). It reads the .d.ts
// files as they are (dtsInput), so this step needs no TypeScript API either.
import { execFileSync } from "node:child_process";
import { isAbsolute, join } from "node:path";

export async function emitTypes(packageDir, { bundle } = {}) {
  execFileSync("tsc", ["-p", "tsconfig.build.json"], {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (!bundle) return;
  const { rolldown } = await import("rolldown");
  const { dts } = await import("rolldown-plugin-dts");
  const build = await rolldown({
    cwd: packageDir,
    input: Object.fromEntries(
      bundle.entries.map((name) => [
        name,
        join(packageDir, ".types", `${name}.d.ts`),
      ]),
    ),
    // Only the listed private packages are inlined; every other package stays an import.
    external: (id) =>
      !id.startsWith(".") &&
      !isAbsolute(id) &&
      !bundle.resolve.some((name) => id === name || id.startsWith(`${name}/`)),
    plugins: [
      dts({
        dtsInput: true,
        emitDtsOnly: true,
        generator: "oxc",
        resolve: bundle.resolve,
        sourcemap: false,
      }),
    ],
  });
  await build.write({ dir: join(packageDir, "dist"), format: "es" });
  await build.close();
}

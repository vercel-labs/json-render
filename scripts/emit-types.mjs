// Writes a package's declaration files with tsc and its tsconfig.build.json. tsup's own `dts`
// option needs the TypeScript 6 API, so tsup configs call this from `onSuccess` instead, which
// runs after every build, including each rebuild in watch mode.
//
// With `bundle`, tsc writes to .types and the entries are bundled into dist with
// rolldown-plugin-dts, inlining the types of the listed private packages (and no others). It reads the .d.ts
// files as they are (dtsInput), so this step needs no TypeScript API either.
//
// `watch` is tsup's watch option, passed by the configs. A failed type check must not end a
// watch session: the throw would skip tsup's startWatcher(), so `tsup --watch src` would exit
// with status 1 instead of waiting for the next edit (and for the packages with two configs,
// it would stop only one of the two watchers). tsc has already printed the diagnostics, and
// because `clean` removes previous declarations on every rebuild, the bundled packages still
// need their rolldown step to put the declarations back.
import { execFileSync } from "node:child_process";
import { isAbsolute, join } from "node:path";

export async function emitTypes(packageDir, { bundle, watch = false } = {}) {
  let tscFailed = false;
  try {
    execFileSync("tsc", ["-p", "tsconfig.build.json"], {
      cwd: packageDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
  } catch (error) {
    if (!watch) throw error;
    tscFailed = true;
  }
  if (!bundle) return;
  const { rolldown } = await import("rolldown");
  const { dts } = await import("rolldown-plugin-dts");
  try {
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
        !bundle.resolve.some(
          (name) => id === name || id.startsWith(`${name}/`),
        ),
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
    try {
      await build.write({ dir: join(packageDir, "dist"), format: "es" });
    } finally {
      await build.close();
    }
  } catch (error) {
    // Nothing to bundle when tsc never wrote .types. Keep watching; the next edit rebuilds.
    if (!watch || !tscFailed) throw error;
    console.error(
      `Could not write bundled declarations for ${packageDir}:`,
      error,
    );
  }
}

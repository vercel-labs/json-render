// @vitest-environment node
/**
 * Contract test for the generated UI evidence.
 *
 * `scripts/orca-ui-evidence.py` captures `orca-evidence/manifest.json` and the
 * three screenshots from the running playground. The directory is generated
 * output (gitignored), so this suite skips when it is absent — which is the
 * case in CI, where no browser run happens — and validates the capture whenever
 * it is present.
 *
 * The assertions mirror the delivery contract for GUI evidence: the screenshots
 * exist at a usable size with a matching digest, the manifest names the official
 * chat catalog, and the recorded UI assertions actually hold.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE = path.join(ROOT, "orca-evidence");
const MANIFEST = path.join(EVIDENCE, "manifest.json");
const CATALOG_URL = "https://api.orcarouter.ai/v1/models?capability=chat";

const REQUIRED_KINDS = [
  "auth-methods",
  "text-model-dropdown",
  "multimodal-model-dropdown",
] as const;

interface EvidenceArtifact {
  kind: string;
  path: string;
  sha256: string;
  ui: Record<string, boolean | number>;
}

interface EvidenceManifest {
  automation: {
    framework: string;
    passed: boolean;
    catalog_source: string;
    catalog_model_count: number;
    image_model_count: number;
  };
  artifacts: EvidenceArtifact[];
}

/** PNG width/height straight from the IHDR chunk. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  if (buffer.subarray(0, 8).toString("latin1") !== "\x89PNG\r\n\x1a\n") {
    throw new Error("not a PNG");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe.skipIf(!existsSync(MANIFEST))("generated OrcaRouter UI evidence", () => {
  const manifest = existsSync(MANIFEST)
    ? (JSON.parse(readFileSync(MANIFEST, "utf-8")) as EvidenceManifest)
    : null;

  it("is produced by a passing Playwright run against the official chat catalog", () => {
    expect(manifest?.automation.framework).toBe("playwright");
    expect(manifest?.automation.passed).toBe(true);
    expect(manifest?.automation.catalog_source).toBe(CATALOG_URL);
    expect(manifest?.automation.catalog_model_count).toBeGreaterThan(0);
    expect(manifest?.automation.image_model_count).toBeGreaterThan(0);
    expect(manifest?.automation.image_model_count).toBeLessThanOrEqual(
      manifest!.automation.catalog_model_count,
    );
  });

  it("ships every required screenshot with a matching digest", () => {
    const kinds = (manifest?.artifacts ?? []).map((item) => item.kind);
    expect(kinds).toEqual(expect.arrayContaining([...REQUIRED_KINDS]));
    for (const artifact of manifest?.artifacts ?? []) {
      const file = path.join(EVIDENCE, artifact.path);
      expect(existsSync(file)).toBe(true);
      const image = readFileSync(file);
      const digest = createHash("sha256").update(image).digest("hex");
      expect(artifact.sha256).toBe(digest);
      const { width, height } = pngSize(image);
      expect(width).toBeGreaterThanOrEqual(800);
      expect(height).toBeGreaterThanOrEqual(450);
      expect(image.byteLength).toBeGreaterThan(10_000);
    }
  });

  it("records the authentication and dropdown assertions from the real UI", () => {
    const byKind = new Map(
      (manifest?.artifacts ?? []).map((item) => [item.kind, item]),
    );
    const auth = byKind.get("auth-methods")!.ui;
    expect(auth.api_key_visible).toBe(true);
    expect(auth.pkce_visible).toBe(true);
    expect(auth.secret_masked).toBe(true);
    expect(auth.controls_enabled).toBe(true);

    for (const kind of ["text-model-dropdown", "multimodal-model-dropdown"]) {
      const ui = byKind.get(kind)!.ui;
      expect(ui.dropdown_open).toBe(true);
      expect(ui.item_count).toBeGreaterThan(0);
      expect(ui.opaque_background).toBe(true);
      expect(ui.visible_border).toBe(true);
      expect(Math.abs(Number(ui.trigger_panel_right_delta))).toBeLessThanOrEqual(2);
    }
    // The live catalog is the only source of the text dropdown.
    expect(byKind.get("text-model-dropdown")!.ui.item_count).toBe(
      manifest!.automation.catalog_model_count,
    );
    expect(byKind.get("multimodal-model-dropdown")!.ui.item_count).toBe(
      manifest!.automation.image_model_count,
    );
  });
});

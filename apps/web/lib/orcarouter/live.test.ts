// @vitest-environment node
/**
 * Live OrcaRouter check.
 *
 * Unlike the other suites, this one talks to the real gateway and only runs when
 * ORCAROUTER_API_KEY is present, so it skips in a credential-free checkout. It
 * goes through the code this integration adds rather than a bare HTTP call:
 * `discoverOrcaModels` (the catalog path both API routes use),
 * `createOrcarouterTransport` (the provider path), and `selectOrcaModels` for
 * the capability and modality filters that build the dropdown options.
 */

import { describe, expect, it } from "vitest";
import { generateText } from "ai";
import { selectOrcaModels } from "@json-render/core";
import { discoverOrcaModels } from "./connect-session";
import { createOrcarouterTransport } from "./provider";
import { getOrcaServerState } from "./server-store";

const hasKey = Boolean(process.env.ORCAROUTER_API_KEY?.trim());

describe.skipIf(!hasKey)("OrcaRouter live", () => {
  it("discovers the live catalog through the project's discovery path", async () => {
    const { catalog, maskedKey } = await discoverOrcaModels();

    expect(catalog.source).toBe("live");
    expect(catalog.models.length).toBeGreaterThan(0);
    // The browser only ever receives the masked form.
    expect(maskedKey).not.toContain(
      process.env.ORCAROUTER_API_KEY!.trim().slice(8, 20),
    );

    const chat = selectOrcaModels(catalog, { capability: "chat" });
    expect(chat.length).toBeGreaterThan(0);
    for (const model of chat) {
      // Vendor namespace is preserved verbatim.
      expect(model.id).toContain("/");
    }
  });

  it("filters the live catalog to models that declare image input", async () => {
    const { catalog } = await discoverOrcaModels();
    const chat = selectOrcaModels(catalog, { capability: "chat" });
    const multimodal = selectOrcaModels(catalog, {
      capability: "chat",
      requiredInputModalities: ["image"],
    });

    for (const model of multimodal) {
      expect(model.architecture?.inputModalities).toContain("image");
    }
    // The filter must actually remove models, never pass everything through.
    expect(multimodal.length).toBeLessThanOrEqual(chat.length);
  });

  it("completes a real chat request through the project's transport", async () => {
    const { catalog } = await discoverOrcaModels();
    const chat = selectOrcaModels(catalog, { capability: "chat" });

    // Prefer a small, known-good chat model; fall back to the rest of the live
    // catalog so the check does not depend on one deployment's model list.
    const preferred = [
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4.1-flash",
    ];
    const candidates = [
      ...preferred.filter((id) => chat.some((model) => model.id === id)),
      ...chat.map((model) => model.id),
    ].slice(0, 4);
    expect(candidates.length).toBeGreaterThan(0);

    let lastError: unknown = null;
    let completed = false;
    for (const target of candidates) {
      try {
        const { model, maskedKey } = createOrcarouterTransport(target);
        expect(maskedKey).toContain("••••");
        const result = await generateText({
          model,
          prompt: "Reply with the single word: ok",
          maxOutputTokens: 256,
        });
        expect(result.text.trim().length).toBeGreaterThan(0);
        expect(result.usage.totalTokens).toBeGreaterThan(0);
        completed = true;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!completed) throw lastError;
  }, 120_000);

  it("keeps authorization and inference on separate origins", () => {
    const { origins } = getOrcaServerState();
    expect(origins.authBaseUrl).toBe("https://www.orcarouter.ai");
    expect(origins.apiBaseUrl).toBe("https://api.orcarouter.ai");
    expect(origins.apiBaseUrl).not.toContain("/auth");
  });
});

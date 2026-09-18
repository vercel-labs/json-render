// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { deepMergeSpec, type Spec } from "@json-render/core";
import { applySpecPatch } from "../spec-patch";
import { createCompositionResponse } from "./response";
import { composeUI } from "./compose";

vi.mock("./compose", () => ({ composeUI: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("playground composition response", () => {
  it("passes the selected spec to the composer and streams patches relative to it", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("JEV_AI_GATEWAY_API_KEY", "test");
    const initialSpec: Spec = {
      root: "card",
      elements: {
        card: { type: "Card", props: { title: "Before" }, children: [] },
      },
      state: { saved: true },
    };
    const spec = structuredClone(initialSpec);
    spec.elements.card!.props.title = "After";
    vi.mocked(composeUI).mockImplementation(async function* () {
      yield {
        type: "complete",
        spec,
        steps: [],
        stopReason: "finish",
        elapsedMs: 1,
        inputTokens: null,
        estimatedCostUsd: null,
      };
    });
    const response = createCompositionResponse(
      new Request("https://example.com/api/generate"),
      "Rename it",
      initialSpec,
    );
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(vi.mocked(composeUI).mock.calls[0]![3]).toEqual(initialSpec);
    const patches = lines.filter((line) => line.op);
    expect(patches).toEqual([
      { op: "replace", path: "/elements/card/props/title", value: "After" },
    ]);
    expect(
      patches.reduce(
        (value, patch) => applySpecPatch(value, patch),
        structuredClone(initialSpec),
      ),
    ).toEqual(spec);
    expect(initialSpec.elements.card!.props.title).toBe("Before");
  });

  it("reveals a new tree atomically after layout, preserving every decision", async () => {
    vi.stubEnv("JEV_AI_GATEWAY_API_KEY", "test");
    const spec: Spec = {
      root: "card",
      elements: { card: { type: "Card", props: {}, children: [] } },
      state: { name: "" },
    };
    const step = {
      index: 0,
      choice: "card",
      description: "Card",
      parent: null,
      slot: null,
      confidence: null,
      parentConfidence: null,
      elapsedMs: 10,
      inputTokens: null,
    };
    const provisional: Spec = {
      ...spec,
      elements: {
        card: { ...spec.elements.card!, props: { title: "Provisional" } },
      },
    };
    vi.mocked(composeUI).mockImplementation(async function* () {
      yield {
        type: "step",
        spec: provisional,
        step: { ...step, choice: "select" },
      };
      yield {
        type: "step",
        spec,
        step: { ...step, index: 1, choice: "layout" },
      };
      yield {
        type: "complete",
        spec,
        steps: [
          { ...step, choice: "select" },
          { ...step, index: 1, choice: "layout" },
          { ...step, index: 2, choice: "finish" },
        ],
        stopReason: "finish",
        elapsedMs: 20,
        inputTokens: null,
        estimatedCostUsd: null,
      };
    });
    const response = createCompositionResponse(
      new Request("https://example.com/api/generate"),
      "Create a card",
    );
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines.slice(0, 2).map((line) => line.__meta)).toEqual([
      "decision",
      "decision",
    ]);
    const updates = lines.filter((line) => line.op || line.__json_edit);
    expect(updates).toEqual([{ __json_edit: true, ...spec }]);
    const { __json_edit, ...snapshot } = updates[0];
    expect(deepMergeSpec({ root: "", elements: {} }, snapshot)).toEqual(spec);
    expect(
      lines
        .filter((line) => line.__meta === "decision")
        .map((line) => line.choice),
    ).toEqual(["select", "layout", "finish"]);
    expect(lines.at(-1)).toMatchObject({
      __meta: "composition",
      stopReason: "finish",
      calls: 3,
      inputTokens: null,
    });
  });

  it.each(["limit", "unavailable"] as const)(
    "does not reveal provisional content when creation ends with %s",
    async (stopReason) => {
      vi.stubEnv("JEV_AI_GATEWAY_API_KEY", "test");
      vi.mocked(composeUI).mockImplementation(async function* () {
        yield {
          type: "complete",
          spec: {
            root: "card",
            elements: { card: { type: "Card", props: {} } },
          },
          steps: [],
          stopReason,
          elapsedMs: 1,
          inputTokens: null,
          estimatedCostUsd: null,
        };
      });
      const response = createCompositionResponse(
        new Request("https://example.com/api/generate"),
        "Create a card",
      );
      const lines = (await response.text())
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      expect(lines).toEqual([
        expect.objectContaining({ __meta: "composition", stopReason }),
      ]);
    },
  );

  it("retains unavailable outcomes and sends failures in the shared protocol", async () => {
    vi.stubEnv("JEV_AI_GATEWAY_API_KEY", "test");
    vi.mocked(composeUI).mockImplementation(async function* () {
      yield {
        type: "complete",
        spec: null,
        steps: [],
        stopReason: "unavailable",
        elapsedMs: 1,
        inputTokens: null,
        estimatedCostUsd: null,
      };
    });
    const request = new Request("https://example.com/api/generate");
    expect(
      await createCompositionResponse(request, "Unavailable request").text(),
    ).toContain('"stopReason":"unavailable"');
    vi.mocked(composeUI).mockImplementation(async function* () {
      yield { type: "error", message: "Provider failed" };
    });
    expect(
      await createCompositionResponse(request, "Create a form").text(),
    ).toContain('"__meta":"error"');
  });

  it("validates requests before starting the model", async () => {
    const request = new Request("https://example.com/api/generate");
    expect(createCompositionResponse(request, " ").status).toBe(400);
    expect(
      createCompositionResponse(request, "Edit", {
        root: "card",
        elements: { card: null },
      }).status,
    ).toBe(400);
    vi.stubEnv("AI_GATEWAY_API_KEY", "default-model-key");
    vi.stubEnv("JEV_AI_GATEWAY_API_KEY", "");
    expect(createCompositionResponse(request, "Create a form").status).toBe(
      503,
    );
    expect(composeUI).not.toHaveBeenCalled();
  });
});

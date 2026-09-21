// @vitest-environment node
import { describe, expect, it } from "vitest";
import { composeUI, type CompositionEvent, type Evaluate } from "./compose";
import { buildCandidates, MAX_ELEMENTS } from "./grammar";

function scripted(
  choices: { next: string; parent?: string }[],
  usage: number | undefined = 100,
): Evaluate {
  let index = 0;
  return async ({ questions, state }) => {
    if (
      questions.root ||
      Object.keys(questions).some((name) => name.startsWith("order_"))
    ) {
      const candidates = buildCandidates(String(state.user_request));
      const selected = state.selected_elements as
        | { id: string; content: string }[]
        | undefined;
      const idFor = (candidateId: string) =>
        selected?.find(
          (element) =>
            element.content ===
            candidates.find((c) => c.id === candidateId)?.description,
        )?.id;
      const answers = Object.fromEntries(
        Object.entries(questions).map(([name, question]) => {
          let choice: string;
          if (name === "root") choice = choices[0]!.next;
          else if (name.startsWith("select_")) {
            if (Object.hasOwn(question.criteria, "0")) {
              const candidate = candidates.find((c) =>
                question.instructions.includes(c.description),
              )!;
              choice = String(
                choices.filter((c) => c.next === candidate.id).length,
              );
            } else {
              choice =
                choices
                  .map((c) => `use:${c.next}`)
                  .find((key) => Object.hasOwn(question.criteria, key)) ??
                "omit";
            }
          } else {
            const id = name.replace(/^(parent|order)_/, "");
            const element = selected!.find((e) => e.id === id)!;
            const candidate = candidates.find(
              (c) => c.description === element.content,
            )!;
            const at = choices.findIndex((c) => c.next === candidate.id);
            const fixture = choices[at]!;
            if (name.startsWith("order_")) choice = String(at);
            else if (fixture.parent?.startsWith("node_")) {
              const originalParent =
                choices[Number(fixture.parent.slice(5))]!.next;
              choice = `${idFor(originalParent)}:default`;
            } else choice = fixture.parent ?? "node_0:default";
          }
          return [name, { choice, confidence: 0.9 }];
        }),
      );
      return { answers, usage: { inputTokens: usage } };
    }
    const selected = choices[index++];
    if (!selected) throw new Error("Unexpected extra model call");
    const answers = Object.fromEntries(
      Object.keys(questions).map((name) => [
        name,
        {
          confidence: 0.9,
          choice: selected[name as keyof typeof selected]!,
        },
      ]),
    );
    return {
      answers,
      usage: { inputTokens: usage },
    };
  };
}

async function collect(
  evaluate: Evaluate,
  signal = new AbortController().signal,
) {
  const events: CompositionEvent[] = [];
  for await (const event of composeUI(
    'Create settings titled "Preferences".',
    signal,
    evaluate,
  ))
    events.push(event);
  return events;
}

describe("Jev catalog composition", () => {
  it("composes profile display content and identifies bound content for follow-up edits", async () => {
    const events: CompositionEvent[] = [];
    for await (const event of composeUI(
      "Design a user profile card",
      new AbortController().signal,
      scripted([
        { next: "card" },
        { next: "profile_avatar_lg" },
        { next: "profile_name" },
        { next: "profile_role" },
        { next: "profile_bio" },
        { next: "finish" },
      ]),
    ))
      events.push(event);
    const first = events.at(-1)!;
    if (first.type !== "complete") throw new Error("Missing profile spec");
    const initialSpec = first.spec!;
    expect(
      Object.values(initialSpec.elements).map((element) => element.type),
    ).toEqual(["Card", "Avatar", "Heading", "Text", "Text"]);
    expect(initialSpec.elements.node_2!.props.text).toEqual({
      $state: "/profile/name",
    });
    expect(initialSpec.state?.profile).toMatchObject({ name: "Maya Chen" });

    // Editing must identify a bound Text by its meaning without sending its value.
    initialSpec.state!.profile = {
      ...(initialSpec.state!.profile as Record<string, unknown>),
      bio: "Private profile biography",
    };
    const before = structuredClone(initialSpec);
    const choose = scripted([{ next: "remove:node_4" }, { next: "finish" }]);
    let calls = 0;
    for await (const event of composeUI(
      "Remove the bio",
      new AbortController().signal,
      async (request) => {
        if (calls++ === 0) {
          expect(request.questions.next!.criteria["remove:node_4"]).toContain(
            "biography",
          );
          expect(request.questions.next!.criteria["remove:node_3"]).toContain(
            "job title or role",
          );
        }
        expect(JSON.stringify(request)).not.toContain(
          "Private profile biography",
        );
        return choose(request);
      },
      initialSpec,
    ))
      events.push(event);
    const edited = events.at(-1)!;
    if (edited.type !== "complete") throw new Error("Missing edited profile");
    expect(edited.spec!.elements).not.toHaveProperty("node_4");
    expect(edited.spec!.elements.node_3).toEqual(initialSpec.elements.node_3);
    expect(edited.spec!.state).toEqual(initialSpec.state);
    expect(initialSpec).toEqual(before);
  });

  it("supports follow-up removal and replacement while preserving the selected version", async () => {
    const first = (
      await collect(
        scripted([
          { next: "card" },
          { next: "heading_7" },
          { next: "input_email" },
          { next: "notifications_switch" },
          { next: "finish" },
        ]),
      )
    ).at(-1)!;
    if (first.type !== "complete") throw new Error("Missing completed spec");
    const initialSpec = first.spec!;
    const before = structuredClone(initialSpec);
    const events: CompositionEvent[] = [];
    for await (const event of composeUI(
      'Remove email notifications and change the heading to "Contact us".',
      new AbortController().signal,
      scripted([
        { next: "remove:node_3" },
        { next: "replace:node_1" },
        { next: "heading_1" },
        { next: "finish" },
      ]),
      initialSpec,
    ))
      events.push(event);
    const last = events.at(-1)!;
    if (last.type !== "complete") throw new Error("Missing edited spec");
    expect(last.spec!.elements.node_1!.props.text).toBe("Contact us");
    expect(last.spec!.elements).not.toHaveProperty("node_3");
    expect(last.spec!.elements.node_2).toEqual(initialSpec.elements.node_2);
    expect(initialSpec).toEqual(before);
  });

  it("composes a new nested tree with state bindings and catalog actions", async () => {
    const events = await collect(
      scripted([
        { next: "card" },
        { next: "input_email" },
        { next: "stack_horizontal" },
        { next: "save", parent: "node_2" },
        { next: "reset", parent: "node_2" },
        { next: "status", parent: "node_0" },
        { next: "finish", parent: "node_0" },
      ]),
    );
    const result = events.at(-1)!;
    expect(result.type).toBe("complete");
    if (result.type !== "complete") throw new Error("Missing final result");
    expect(result.stopReason).toBe("finish");
    expect(result.spec?.elements.node_0?.children).toEqual([
      "node_2",
      "node_1",
      "node_5",
    ]);
    expect(result.spec?.elements.node_1?.children).toEqual([
      "node_3",
      "node_4",
    ]);
    expect(result.spec?.elements.node_2?.props.value).toEqual({
      $bindState: "/form/email",
    });
    expect(result.spec?.elements.node_3?.on?.press).toEqual({
      action: "setState",
      params: { statePath: "/status", value: "Changes saved locally." },
    });
    expect(result.inputTokens).toBe(200);
    expect(result.steps).toHaveLength(2);
    // Streamed snapshots stay immutable as later elements are appended.
    const first = events[0]!;
    expect(first.type === "step" && Object.keys(first.spec.elements)).toEqual([
      "node_0",
      "node_1",
      "node_2",
      "node_3",
      "node_4",
      "node_5",
    ]);
  });

  it("cannot accept an arbitrary component, path, or nonexistent parent from the model", async () => {
    await expect(
      collect(scripted([{ next: "execute_shell" }])),
    ).rejects.toThrow("outside the permitted");
    await expect(
      collect(
        scripted([
          { next: "card" },
          { next: "stack_horizontal" },
          { next: "save", parent: "/secrets" },
        ]),
      ),
    ).rejects.toThrow("outside the permitted");
  });

  it("supplies literal quoted text as a value, never as executable structure", () => {
    const text = "<script>alert(1)</script>";
    const candidates = buildCandidates(`Title the UI "${text}".`);
    expect(
      candidates.find((c) => c.element.props.text === text)?.element.type,
    ).toBe("Heading");
  });

  it("reports unavailable capability without producing a misleading empty UI", async () => {
    const events = await collect(scripted([{ next: "unavailable" }]));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "complete",
      spec: null,
      stopReason: "unavailable",
    });
  });

  it("preserves unknown usage and stops at the configured call budget", async () => {
    const events = await collect(
      scripted([{ next: "card" }, { next: "finish" }], undefined),
    );
    // Explicitly remove usage to exercise the missing-usage path.
    const missingUsage: Evaluate = async (request) => {
      const result = await scripted([{ next: "unavailable" }])(request);
      return { ...result, usage: undefined };
    };
    expect((await collect(missingUsage)).at(-1)).toMatchObject({
      inputTokens: null,
      estimatedCostUsd: null,
    });
    expect(events.at(-1)?.type).toBe("complete");
    const choices = [
      { next: "card" },
      ...Array.from({ length: MAX_ELEMENTS }, () => ({
        next: "separator",
      })),
    ];
    const limited = (await collect(scripted(choices))).at(-1);
    expect(limited).toMatchObject({ type: "complete", stopReason: "limit" });
    if (limited?.type === "complete")
      expect(Object.keys(limited.spec!.elements)).toHaveLength(MAX_ELEMENTS);
  });

  it("honors cancellation before making another provider request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(collect(scripted([]), controller.signal)).rejects.toThrow();
  });
});

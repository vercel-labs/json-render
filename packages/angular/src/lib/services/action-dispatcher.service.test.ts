import { describe, expect, it } from "vitest";
import { TestBed } from "@angular/core/testing";

import { ActionDispatcherService } from "./action-dispatcher.service";
import { SpecStateService } from "./spec-state.service";
import { ValidationService } from "./validation.service";

function setup() {
  TestBed.configureTestingModule({
    providers: [SpecStateService, ValidationService, ActionDispatcherService],
  });
  return {
    dispatcher: TestBed.inject(ActionDispatcherService),
    state: TestBed.inject(SpecStateService),
    validation: TestBed.inject(ValidationService),
  };
}

describe("ActionDispatcherService built-ins", () => {
  it("setState writes to state", async () => {
    const { dispatcher, state } = setup();
    await dispatcher.execute({
      action: "setState",
      params: { statePath: "/tab", value: "home" },
    });
    expect(state.get("/tab")).toBe("home");
  });

  it("pushState appends and clears", async () => {
    const { dispatcher, state } = setup();
    state.set("/items", ["a"]);
    await dispatcher.execute({
      action: "pushState",
      params: { statePath: "/items", value: "b", clearStatePath: "/draft" },
    });
    expect(state.get("/items")).toEqual(["a", "b"]);
    expect(state.get("/draft")).toBe("");
  });

  it("removeState removes by index", async () => {
    const { dispatcher, state } = setup();
    state.set("/items", ["a", "b", "c"]);
    await dispatcher.execute({
      action: "removeState",
      params: { statePath: "/items", index: 1 },
    });
    expect(state.get("/items")).toEqual(["a", "c"]);
  });

  it("validateForm writes { valid, errors } to state and does not throw (B2)", async () => {
    const { dispatcher, state, validation } = setup();
    validation.registerField("/email", {
      checks: [{ type: "required", message: "Required" }],
    });
    // No value set -> required fails.
    await expect(
      dispatcher.execute({ action: "validateForm" }),
    ).resolves.toBeUndefined();

    const result = state.get("/formValidation") as {
      valid: boolean;
      errors: Record<string, string[]>;
    };
    expect(result.valid).toBe(false);
    expect(result.errors["/email"]).toContain("Required");
  });

  it("validateForm honors a custom statePath (B2)", async () => {
    const { dispatcher, state, validation } = setup();
    validation.registerField("/name", {
      checks: [{ type: "required", message: "Name required" }],
    });
    state.set("/name", "Ada");
    await dispatcher.execute({
      action: "validateForm",
      params: { statePath: "/formResult" },
    });
    const result = state.get("/formResult") as { valid: boolean };
    expect(result.valid).toBe(true);
  });
});
